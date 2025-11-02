import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  Image as ImageIcon, 
  Link, 
  Paperclip,
  X
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  attachments?: string[];
  onAttachmentsChange?: (attachments: string[]) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
  onImageInsert?: (url: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  attachments = [],
  onAttachmentsChange,
  onToast,
  onImageInsert
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sync value with editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast?.('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      onToast?.('Image size must be less than 5MB', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `post-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post-attachments')
        .getPublicUrl(filePath);

      // Insert image into editor
      executeCommand('insertImage', publicUrl);
      onImageInsert?.(publicUrl);
      onToast?.('Image uploaded successfully', 'success');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      onToast?.('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange?.(newAttachments);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Numbered List"
        >
          <List className="w-4 h-4 rotate-90" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter image URL:');
            if (url) {
              executeCommand('insertImage', url);
              onImageInsert?.(url);
            }
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Insert Image URL"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center relative"
          disabled={disabled || isUploading}
          title="Upload Image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
              }
              e.target.value = ''; // Reset input
            }}
          />
          <Paperclip className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter link URL:');
            const text = prompt('Enter link text:');
            if (url && text) {
              executeCommand('createLink', url);
            }
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          disabled={disabled || isUploading}
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            handleInput();
          }}
          className={`min-h-[200px] max-h-[400px] overflow-y-auto p-4 focus:outline-none ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          suppressContentEditableWarning
          data-placeholder={placeholder}
        />
        <style>{`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        `}</style>
      </div>

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 mb-2 font-medium">Attachments:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1 text-xs"
              >
                <a
                  href={attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate max-w-[200px]"
                >
                  {attachment.split('/').pop()}
                </a>
                {!disabled && onAttachmentsChange && (
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-600 hover:text-red-700 ml-1"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="px-4 py-2 bg-blue-50 border-t border-gray-200 text-sm text-blue-600">
          Uploading...
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;

import React, { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';
import { Star, VolumeX, Archive, Mail } from 'lucide-react';
import { haptic } from '../utils/hapticFeedback';

interface Profile {
  id: string;
  full_name: string;
  profession?: string;
  avatar_url?: string | null;
}

interface Conversation {
  id: string;
  other_user: Profile;
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

interface SwipeableConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isStarred: boolean;
  isMuted: boolean;
  isArchived: boolean;
  formatTime: (timestamp: string) => string;
  onClick: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onMarkAsUnread?: () => void;
  onToggleArchive?: () => void;
}

export const SwipeableConversationItem: React.FC<SwipeableConversationItemProps> = ({
  conversation,
  isSelected,
  isStarred,
  isMuted,
  formatTime,
  onClick,
  onSwipeLeft,
  onSwipeRight,
  onMarkAsUnread,
  onToggleArchive
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const MAX_SWIPE_DISTANCE = 120;

  useEffect(() => {
    // Reset swipe position when conversation changes
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [conversation.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!itemRef.current) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = startXRef.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !itemRef.current) return;

    currentXRef.current = e.touches[0].clientX;
    const deltaX = currentXRef.current - startXRef.current;

    // Calculate resistance
    let offset = deltaX;
    if (Math.abs(deltaX) > MAX_SWIPE_DISTANCE) {
      const excess = Math.abs(deltaX) - MAX_SWIPE_DISTANCE;
      offset = deltaX > 0 
        ? MAX_SWIPE_DISTANCE + excess * 0.3
        : -(MAX_SWIPE_DISTANCE + excess * 0.3);
    }

    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    const finalOffset = currentXRef.current - startXRef.current;
    
    if (Math.abs(finalOffset) > SWIPE_THRESHOLD) {
      if (finalOffset > 0 && onSwipeRight) {
        // Swipe right - mark as read
        haptic.light();
        onSwipeRight();
      } else if (finalOffset < 0 && onSwipeLeft) {
        // Swipe left - archive
        haptic.light();
        onSwipeLeft();
      }
    }

    // Animate back
    setSwipeOffset(0);
    setIsSwiping(false);
    startXRef.current = 0;
    currentXRef.current = 0;
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    haptic.light();
    action();
    setSwipeOffset(0);
  };

  // Show background actions only when swiping left or right
  const showLeftAction = swipeOffset < -20;
  const showRightAction = swipeOffset > 20;

  return (
    <div
      ref={itemRef}
      className="relative overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Left Action - Archive (when swiping left) */}
        {onToggleArchive && (
          <div
            className={`flex-1 bg-orange-500 flex items-center justify-end px-4 transition-opacity ${
              showLeftAction ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => handleActionClick(e, onToggleArchive)}
          >
            <Archive className="w-5 h-5 text-white" />
            <span className="text-white ml-2 font-medium">
              {isArchived ? 'Unarchive' : 'Archive'}
            </span>
          </div>
        )}

        {/* Right Action - Mark as Read (when swiping right) */}
        {onMarkAsUnread && (conversation.unread_count ?? 0) > 0 && (
          <div
            className={`flex-1 bg-blue-500 flex items-center justify-start px-4 transition-opacity ${
              showRightAction ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => handleActionClick(e, onMarkAsUnread)}
          >
            <Mail className="w-5 h-5 text-white" />
            <span className="text-white ml-2 font-medium">Mark Read</span>
          </div>
        )}
      </div>

      {/* Conversation Content */}
      <div
        className={`relative z-10 bg-white transition-transform duration-200 ${
          isSwiping ? '' : 'duration-300 ease-out'
        } ${
          isSelected
            ? 'bg-blue-50 border-l-4 border-blue-600'
            : 'border-l-4 border-transparent'
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          touchAction: 'pan-y'
        }}
        onClick={onClick}
      >
        <div className="flex items-center px-4 py-3 cursor-pointer">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar
              src={conversation.other_user?.avatar_url}
              name={conversation.other_user?.full_name}
              className="w-12 h-12 shadow-sm"
              useInlineSize={false}
            />
            {(conversation.unread_count ?? 0) > 0 && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 ml-3">
            <div className="flex justify-between items-center pr-2">
              <div className="flex items-center min-w-0">
                <p className={`${(conversation.unread_count ?? 0) > 0 ? 'font-bold' : 'font-semibold'} text-gray-900 truncate`}>
                  {conversation.other_user.full_name}
                </p>
                {isStarred && (
                  <Star className="w-4 h-4 ml-1 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                {isMuted && (
                  <VolumeX className="w-4 h-4 ml-1 text-gray-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center flex-shrink-0 gap-2">
                {conversation.last_message?.created_at && (
                  <span className={`text-xs ${((conversation.unread_count ?? 0) > 0) ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    {formatTime(conversation.last_message.created_at)}
                  </span>
                )}
                {(conversation.unread_count ?? 0) > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                    {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 truncate">{conversation.other_user.profession}</p>
            <p className="text-sm text-gray-700 truncate mt-0.5">
              {(conversation.unread_count ?? 0) > 0 ? (
                <span className="text-gray-900 font-medium">{conversation.last_message?.content}</span>
              ) : (
                conversation.last_message?.content || <span className="text-gray-400 italic">No messages yet</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

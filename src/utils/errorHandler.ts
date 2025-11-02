/**
 * Get user-friendly error message from various error types
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    // Supabase-specific errors
    if (error.code === '42P01') {
      return 'Database table not found. Please contact support.';
    }
    if (error.code === '42501') {
      return 'Permission denied. Please check your access rights.';
    }
    if (error.code === '42703') {
      return 'Database error. Please refresh the page.';
    }
    if (error.code === '23505') {
      return 'This item already exists.';
    }
    if (error.code === '23503') {
      return 'Invalid reference. The item may have been deleted.';
    }
    if (error.code === 'PGRST116') {
      return 'No rows found.';
    }

    return error.message;
  }

  if (error?.error) {
    return getErrorMessage(error.error);
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Standardized error handler wrapper function
 * This should be used inside components where toast is available
 */
export const handleAsyncError = async <T,>(
  operation: () => Promise<T>,
  toast: { success: (msg: string) => void; error: (msg: string) => void },
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    throwError?: boolean;
  }
): Promise<T | undefined> => {

  try {
    const result = await operation();
    
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    
    if (options?.onSuccess) {
      options.onSuccess(result);
    }
    
    return result;
  } catch (error: any) {
    console.error('Operation failed:', error);
    
    const errorMessage = 
      error?.message || 
      options?.errorMessage || 
      'An unexpected error occurred';
    
    toast.error(errorMessage);
    
    if (options?.onError) {
      options.onError(error);
    }
    
    if (options?.throwError !== false) {
      throw error;
    }
  }
};

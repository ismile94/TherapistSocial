import React from 'react';

// Post Card Skeleton
export const PostSkeleton = () => (
  <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm animate-pulse">
    {/* Header */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </div>
    
    {/* Title */}
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
    
    {/* Content */}
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
    
    {/* Actions */}
    <div className="flex gap-4">
      <div className="h-8 bg-gray-200 rounded w-20" />
      <div className="h-8 bg-gray-200 rounded w-20" />
      <div className="h-8 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

// Profile Card Skeleton
export const ProfileSkeleton = () => (
  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

// Message List Skeleton
export const MessageSkeleton = () => (
  <div className="p-4 border-b border-gray-200 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-48" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-12" />
    </div>
  </div>
);

// Profile Page Skeleton
export const ProfilePageSkeleton = () => (
  <div className="flex-1 bg-gray-50 animate-pulse">
    {/* Header */}
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-40" />
        </div>
      </div>
    </div>
    
    {/* Content */}
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  </div>
);

// Settings Skeleton
export const SettingsSkeleton = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-6xl h-[80vh] overflow-hidden animate-pulse">
      <div className="p-6 border-b border-gray-200">
        <div className="h-8 bg-gray-200 rounded w-32" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    </div>
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton = () => (
  <div className="p-4 space-y-2 animate-pulse">
    <div className="h-4 bg-gray-100 rounded w-20 mb-3" />
    <div className="flex items-center gap-3 p-2">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </div>
    <div className="flex items-center gap-3 p-2">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </div>
    <div className="flex items-center gap-3 p-2">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
    </div>
  </div>
);

// Connection List Skeleton
export const ConnectionListSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <ProfileSkeleton />
    <ProfileSkeleton />
    <ProfileSkeleton />
  </div>
);

// Notification Skeleton
export const NotificationSkeleton = () => (
  <div className="p-4 border-b border-gray-200 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-12" />
    </div>
  </div>
);

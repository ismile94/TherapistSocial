import React from 'react';

// Shimmer animation base component
const ShimmerBase = ({ className = '' }: { className?: string }) => (
  <div 
    className={`
      bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 
      bg-[length:200%_100%] 
      animate-shimmer 
      ${className}
    `}
  />
);

// Post Card Skeleton
export const PostSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-soft overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-3 mb-4">
      <ShimmerBase className="w-11 h-11 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerBase className="h-4 rounded-lg w-32" />
        <ShimmerBase className="h-3 rounded-lg w-24" />
      </div>
      <ShimmerBase className="w-8 h-8 rounded-lg" />
    </div>
    
    {/* Title */}
    <ShimmerBase className="h-6 rounded-lg w-4/5 mb-4" />
    
    {/* Content */}
    <div className="space-y-2.5 mb-5">
      <ShimmerBase className="h-4 rounded-lg w-full" />
      <ShimmerBase className="h-4 rounded-lg w-full" />
      <ShimmerBase className="h-4 rounded-lg w-3/5" />
    </div>
    
    {/* Actions */}
    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
      <ShimmerBase className="h-9 rounded-xl w-20" />
      <ShimmerBase className="h-9 rounded-xl w-20" />
      <ShimmerBase className="h-9 rounded-xl w-20" />
      <div className="flex-1" />
      <ShimmerBase className="h-9 rounded-xl w-9" />
    </div>
  </div>
);

// Profile Card Skeleton
export const ProfileSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft overflow-hidden">
    <div className="flex items-center gap-4">
      <ShimmerBase className="w-14 h-14 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerBase className="h-4 rounded-lg w-36" />
        <ShimmerBase className="h-3 rounded-lg w-28" />
      </div>
      <ShimmerBase className="h-9 rounded-xl w-24" />
    </div>
  </div>
);

// Message List Skeleton
export const MessageSkeleton = () => (
  <div className="p-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
    <div className="flex items-center gap-3">
      <ShimmerBase className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <ShimmerBase className="h-4 rounded-lg w-32" />
          <ShimmerBase className="h-3 rounded-lg w-12" />
        </div>
        <ShimmerBase className="h-3 rounded-lg w-48" />
      </div>
    </div>
  </div>
);

// Profile Page Skeleton
export const ProfilePageSkeleton = () => (
  <div className="flex-1 bg-gradient-to-b from-gray-50 to-white min-h-screen">
    {/* Cover Image */}
    <ShimmerBase className="h-48 sm:h-64 w-full" />
    
    {/* Profile Info */}
    <div className="relative px-4 sm:px-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-20">
        <ShimmerBase className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl ring-4 ring-white shadow-lg flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <ShimmerBase className="h-7 rounded-lg w-48" />
          <ShimmerBase className="h-4 rounded-lg w-36" />
          <ShimmerBase className="h-4 rounded-lg w-52" />
        </div>
        <ShimmerBase className="h-10 rounded-xl w-32 hidden sm:block" />
      </div>
      
      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft">
            <ShimmerBase className="h-6 rounded-lg w-12 mx-auto mb-2" />
            <ShimmerBase className="h-3 rounded-lg w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Content Tabs */}
    <div className="px-4 sm:px-6 mb-4">
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl">
        <ShimmerBase className="h-9 rounded-lg flex-1" />
        <ShimmerBase className="h-9 rounded-lg flex-1" />
        <ShimmerBase className="h-9 rounded-lg flex-1" />
      </div>
    </div>
    
    {/* Content */}
    <div className="px-4 sm:px-6 space-y-4">
      <PostSkeleton />
      <PostSkeleton />
    </div>
  </div>
);

// Settings Skeleton
export const SettingsSkeleton = () => (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] overflow-hidden shadow-elevated">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <ShimmerBase className="h-7 rounded-lg w-28" />
        <ShimmerBase className="h-9 w-9 rounded-xl" />
      </div>
      
      {/* Content */}
      <div className="flex h-[calc(100%-4rem)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-100 p-4 space-y-2 hidden md:block">
          {[1, 2, 3, 4, 5].map((i) => (
            <ShimmerBase key={i} className="h-11 rounded-xl w-full" />
          ))}
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <ShimmerBase className="h-6 rounded-lg w-40 mb-6" />
          
          <div className="space-y-4">
            <div>
              <ShimmerBase className="h-4 rounded-lg w-24 mb-2" />
              <ShimmerBase className="h-11 rounded-xl w-full" />
            </div>
            <div>
              <ShimmerBase className="h-4 rounded-lg w-28 mb-2" />
              <ShimmerBase className="h-11 rounded-xl w-full" />
            </div>
            <div>
              <ShimmerBase className="h-4 rounded-lg w-20 mb-2" />
              <ShimmerBase className="h-11 rounded-xl w-full" />
            </div>
          </div>
          
          <ShimmerBase className="h-11 rounded-xl w-32 mt-6" />
        </div>
      </div>
    </div>
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton = () => (
  <div className="p-4 space-y-3">
    <ShimmerBase className="h-3 rounded-lg w-20 mb-4" />
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50">
        <ShimmerBase className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBase className="h-4 rounded-lg w-32" />
          <ShimmerBase className="h-3 rounded-lg w-24" />
        </div>
      </div>
    ))}
  </div>
);

// Connection List Skeleton
export const ConnectionListSkeleton = () => (
  <div className="space-y-3 p-4">
    <ProfileSkeleton />
    <ProfileSkeleton />
    <ProfileSkeleton />
  </div>
);

// Notification Skeleton
export const NotificationSkeleton = () => (
  <div className="p-4 border-b border-gray-100">
    <div className="flex items-start gap-3">
      <ShimmerBase className="w-11 h-11 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerBase className="h-4 rounded-lg w-4/5" />
        <ShimmerBase className="h-3 rounded-lg w-3/5" />
        <ShimmerBase className="h-3 rounded-lg w-16 mt-1" />
      </div>
    </div>
  </div>
);

// Event Card Skeleton
export const EventSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-soft">
    <ShimmerBase className="h-40 w-full" />
    <div className="p-5 space-y-3">
      <ShimmerBase className="h-5 rounded-lg w-4/5" />
      <div className="flex items-center gap-2">
        <ShimmerBase className="h-4 w-4 rounded" />
        <ShimmerBase className="h-4 rounded-lg w-32" />
      </div>
      <div className="flex items-center gap-2">
        <ShimmerBase className="h-4 w-4 rounded" />
        <ShimmerBase className="h-4 rounded-lg w-40" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <ShimmerBase className="h-8 w-8 rounded-full" />
        <ShimmerBase className="h-9 rounded-xl w-24" />
      </div>
    </div>
  </div>
);

// Feed Loading Component
export const FeedLoading = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4 animate-fade-in">
    {Array.from({ length: count }).map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);

// Map Marker Skeleton
export const MapMarkerSkeleton = () => (
  <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100 w-64">
    <div className="flex items-center gap-3">
      <ShimmerBase className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerBase className="h-4 rounded-lg w-28" />
        <ShimmerBase className="h-3 rounded-lg w-20" />
      </div>
    </div>
    <ShimmerBase className="h-9 rounded-xl w-full mt-3" />
  </div>
);

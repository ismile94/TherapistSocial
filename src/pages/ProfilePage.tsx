/**
 * Profile Page
 * 
 * This page wraps the ProfileDetailPage component.
 * The profile ID is extracted from the URL params.
 * 
 * For now, it uses the exported component from App.tsx and receives
 * necessary props through the app context or parent components.
 */

// Note: ProfileDetailPage requires many props from the parent component.
// It's rendered directly in AppInner for now due to state dependencies.
// This file is a placeholder for future refactoring.

export default function ProfilePage() {
  // This page is handled by AppInner through URL-based state
  // The ProfileDetailPage component is rendered there when selectedProfileId is set
  return null
}


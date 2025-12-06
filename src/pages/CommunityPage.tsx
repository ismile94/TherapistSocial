/**
 * Community Page
 * 
 * This page wraps the CommunityComponent.
 * 
 * For now, it uses the exported component from App.tsx and receives
 * necessary props through the app context or parent components.
 */

// Note: CommunityComponent requires many props from the parent component.
// It's rendered directly in AppInner for now due to state dependencies.
// This file is a placeholder for future refactoring.

export default function CommunityPage() {
  // This page is handled by AppInner through URL-based state
  // The CommunityComponent is rendered there when activeView is 'community'
  return null
}


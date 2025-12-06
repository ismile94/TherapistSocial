/**
 * Map Page
 * 
 * This page wraps the MapComponent.
 * 
 * For now, it uses the exported component from App.tsx and receives
 * necessary props through the app context or parent components.
 */

// Note: MapComponent requires props from the parent component.
// It's rendered directly in AppInner for now due to state dependencies.
// This file is a placeholder for future refactoring.

export default function MapPage() {
  // This page is handled by AppInner through URL-based state
  // The MapComponent is rendered there when activeView is 'map'
  return null
}


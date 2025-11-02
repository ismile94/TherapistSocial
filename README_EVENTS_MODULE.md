# Upcoming Events Module

## Overview
A fully functional "Upcoming Events / Yaklaşan Etkinlikler" module for the therapist-finder application. This module allows both organizers and participants to create, view, and manage events.

## Features Implemented

### 1. Event Creation (Organizer)
- ✅ Event title/name
- ✅ Description (200-300 characters with validation)
- ✅ Start and end date/time
- ✅ Location (physical address or online link)
- ✅ Participant limit (optional)
- ✅ Registration type (RSVP or automatic)
- ✅ Event categories (Workshop, Group Therapy, Webinar, Networking, Seminar, Other)
- ✅ Thumbnail/icon support

### 2. Event Viewing and Participation (User)
- ✅ Event list sorted by date (nearest first)
- ✅ Event preview with title, date, time, participant count
- ✅ Detailed view modal with full description
- ✅ RSVP button (Join/Leave with one click)
- ✅ Cancel/Leave functionality with automatic updates
- ✅ Google Calendar integration (Add to Calendar button)
- ✅ Event link sharing (copy to clipboard)
- ✅ Category filtering

### 3. Admin/Organizer Panel
- ✅ View all created events
- ✅ Edit event functionality (UI ready, full edit modal can be added)
- ✅ Delete events
- ✅ View participant list for each event
- ✅ Event statistics (participant counts)

### 4. UX/UI Features
- ✅ Right sidebar widget (expanded/collapsed view)
- ✅ Clean card design with "Upcoming Events" title
- ✅ Event preview with 2-3 lines, clear date/time display
- ✅ Modal popup on click/hover
- ✅ Clear RSVP button ("Katıl" / "Joined" states)
- ✅ Mobile responsive design
- ✅ Real-time updates via Supabase subscriptions

### 5. Technical Implementation
- ✅ Database tables: `events` and `event_participants`
- ✅ Supabase integration with RLS policies
- ✅ Real-time subscriptions for live updates
- ✅ RSVP toggle with single endpoint
- ✅ Automatic filtering of past events

### 6. Optional Features (Included)
- ✅ Event category filtering
- ✅ Event link sharing
- ✅ Calendar integration
- ✅ Participant count display
- ✅ Organizer information display

## Database Setup

### Run the SQL Migration

Before using the events module, you need to run the SQL migration file in your Supabase SQL Editor:

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Run the migration file: `supabase_migrations/001_create_events_tables.sql`

This will create:
- `events` table with all required fields
- `event_participants` table for RSVP tracking
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp triggers

## Usage

### For Organizers (Event Creators)

1. **Create an Event:**
   - Click the "+" button in the Upcoming Events widget
   - Fill in all required fields (title, description 200-300 chars, date/time, location)
   - Optionally set max participants, category, and thumbnail
   - Click "Create Event"

2. **Manage Your Events:**
   - Click the edit icon (pencil) in the widget header when you have events
   - View all your events in the organizer panel
   - Click "View Participants" to see who joined
   - Edit or delete events as needed

### For Participants

1. **View Events:**
   - Events are automatically displayed in the right sidebar widget
   - Click to expand and see all upcoming events
   - Use category filters to find specific event types

2. **Join an Event:**
   - Click on an event to see details
   - Click "Join Event / Katıl" button
   - Your participation will be recorded

3. **Leave an Event:**
   - Click "Joined - Leave Event" button
   - You will be removed from the participant list

4. **Add to Calendar:**
   - Click "Add to Calendar" in event details
   - Opens Google Calendar with event pre-filled

5. **Share Event:**
   - Click "Share" button
   - Event link is copied to clipboard

## Component Structure

```
src/components/UpcomingEvents.tsx
├── UpcomingEvents (Main Component)
│   ├── Event filtering and display
│   ├── RSVP functionality
│   └── Modal management
├── EventDetailModal
│   ├── Full event information
│   ├── RSVP/Leave actions
│   └── Calendar and share actions
├── EventCreateModal
│   ├── Event creation form
│   └── Validation
└── EventOrganizerPanel
    ├── Event list management
    ├── Participant viewing
    └── Delete functionality
```

## Type Definitions

Event types are defined in `src/types/index.ts`:
- `Event` interface
- `EventParticipant` interface

## Integration

The component is integrated into `App.tsx` and replaces the previous placeholder:
```tsx
<UpcomingEvents 
  currentUserId={currentUser?.id}
  userProfile={userProfile}
/>
```

## Styling

- Uses Tailwind CSS for styling
- Responsive design with mobile-first approach
- Animations via framer-motion
- Consistent with existing app design language

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only:
  - Create events for themselves (organizer_id must match auth.uid())
  - Edit/delete their own events
  - Join/leave events
  - View all upcoming events (public)

## Future Enhancements

Potential additions:
- Email/push notifications for event reminders
- Event comments/chat
- Recurring events
- Event search functionality
- Event export (CSV/PDF participant lists)
- Image upload for thumbnails (currently URL-based)
- Event waiting lists when max participants reached


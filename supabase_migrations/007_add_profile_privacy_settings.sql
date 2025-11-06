-- Add profile privacy and visibility settings to user_settings table

-- Add connection request permissions
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS connection_request_permissions TEXT DEFAULT 'public' CHECK (connection_request_permissions IN ('public', 'network', 'none'));

-- Add profile information visibility settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_email TEXT DEFAULT 'network' CHECK (show_email IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_phone TEXT DEFAULT 'network' CHECK (show_phone IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_location TEXT DEFAULT 'public' CHECK (show_location IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_profession TEXT DEFAULT 'public' CHECK (show_profession IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_specialties TEXT DEFAULT 'public' CHECK (show_specialties IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_qualifications TEXT DEFAULT 'network' CHECK (show_qualifications IN ('public', 'network', 'private'));
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS show_experience TEXT DEFAULT 'network' CHECK (show_experience IN ('public', 'network', 'private'));

-- Add comments
COMMENT ON COLUMN user_settings.connection_request_permissions IS 'Who can send connection requests: public, network, or none';
COMMENT ON COLUMN user_settings.show_email IS 'Who can see email: public, network, or private';
COMMENT ON COLUMN user_settings.show_phone IS 'Who can see phone: public, network, or private';
COMMENT ON COLUMN user_settings.show_location IS 'Who can see location: public, network, or private';
COMMENT ON COLUMN user_settings.show_profession IS 'Who can see profession: public, network, or private';
COMMENT ON COLUMN user_settings.show_specialties IS 'Who can see specialties: public, network, or private';
COMMENT ON COLUMN user_settings.show_qualifications IS 'Who can see qualifications: public, network, or private';
COMMENT ON COLUMN user_settings.show_experience IS 'Who can see work experience: public, network, or private';


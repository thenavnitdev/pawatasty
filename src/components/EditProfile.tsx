import { ChevronLeft, Camera, ChevronDown, Trash2, Loader2, User, Globe, Mail, Phone, Users } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DeleteAccountModal from './DeleteAccountModal';
import PhoneNumberModal from './PhoneNumberModal';
import { profileEdgeAPI } from '../services/mobile/profileEdge';
import { isFeatureEnabled } from '../services/apiConfig';
import { parsePhoneNumber } from '../utils/phoneValidation';
import { uploadProfilePicture, deleteProfilePicture } from '../utils/imageUpload';
import { clearProfileImageCache } from '../utils/imageUtils';
import CachedProfileImage from './CachedProfileImage';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone_nr: string;
  gender: string;
  age: string;
  bio: string;
  website: string;
  profile_picture: string;
  instagram: string;
  tiktok: string;
  points_count: number;
  saved_qty: string;
  profile_level: string;
}

interface EditProfileProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: () => void;
}

export default function EditProfile({ profile, onClose, onSave }: EditProfileProps) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    username: profile.username || '',
    website: profile.website || '',
    bio: profile.bio || '',
    email: profile.email || '',
    phone_nr: profile.phone_nr || '',
    gender: profile.gender || '',
    age: profile.age || ''
  });
  const [saving, setSaving] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImagePath, setProfileImagePath] = useState(profile.profile_picture || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const oldImagePath = profile.profile_picture;

      // Clear old image from cache
      if (oldImagePath) {
        clearProfileImageCache(oldImagePath);
      }

      const result = await uploadProfilePicture(file, user.id);

      const { error } = await supabase
        .from('users')
        .update({ profile_picture: result.path })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfileImagePath(result.path);

      if (oldImagePath && oldImagePath.startsWith('user_profile/')) {
        await deleteProfilePicture(oldImagePath).catch(console.error);
      }

      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 2000);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isFeatureEnabled('USE_EDGE_PROFILE')) {
        await profileEdgeAPI.updateProfile({
          firstName: formData.full_name?.split(' ')[0],
          lastName: formData.full_name?.split(' ').slice(1).join(' '),
          phoneNumber: formData.phone_nr,
          gender: formData.gender,
          dateOfBirth: formData.age ? String(parseInt(formData.age)) : undefined,
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        const updateData = {
          full_name: formData.full_name,
          username: formData.username,
          website: formData.website,
          bio: formData.bio,
          phone_nr: formData.phone_nr,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age) : null
        };

        console.log('Saving profile data:', updateData);
        console.log('Profile ID:', profile.id);

        if (profile.id) {
          const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', profile.id)
            .select();

          if (error) {
            console.error('Update error:', error);
            throw error;
          }
          console.log('Profile updated successfully:', data);
        } else {
          const { data, error } = await supabase
            .from('users')
            .insert({
              user_id: user.id,
              email: formData.email,
              ...updateData
            })
            .select();

          if (error) {
            console.error('Insert error:', error);
            throw error;
          }
          console.log('Profile created successfully:', data);
        }
      }

      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
        onSave();
      }, 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-hidden">
      {showSuccessNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slide-down px-4 w-full max-w-[340px]">
          <div className="bg-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm leading-tight">Change saved</h3>
              <p className="text-gray-600 text-xs leading-tight mt-0.5">changes were successful saved.</p>
            </div>
          </div>
        </div>
      )}

      <div className="h-full overflow-y-auto pb-24">
        <div className="min-h-full w-full max-w-md mx-auto bg-gray-50">
          <div className="sticky top-0 bg-gray-50 z-10 px-4 py-4 flex items-center border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold text-gray-900 pr-10">Edit Profile</h1>
          </div>

          <div className="px-4 py-6 space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-2">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg overflow-hidden">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <CachedProfileImage
                      imagePath={profileImagePath}
                      userName={formData.full_name || 'User'}
                      size="large"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? 'Uploading...' : 'Change Profile Photo'}
              </button>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Profile Information</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <User className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Name</label>
                  </div>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 56 56"><path fill="currentColor" d="M8.746 37.703h7.149l-2.133 10.594a4 4 0 0 0-.07.75c0 1.148.796 1.781 1.898 1.781c1.125 0 1.945-.61 2.18-1.758l2.296-11.367h11.086L29.02 48.297c-.07.234-.093.516-.093.75c0 1.148.797 1.781 1.922 1.781s1.945-.61 2.18-1.758L35.3 37.703h8.367c1.289 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875h-7.946L38.63 21.25h8.203c1.29 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875H39.45l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.82-1.805-1.945-1.805c-1.312 0-1.898.726-2.133 1.828l-2.062 10.172H24.215l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.844-1.805-1.945-1.805c-1.336 0-1.946.726-2.157 1.828l-2.062 10.172h-7.687c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805h7.289l-2.485 12.375h-7.57c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805m12.14-4.078l2.509-12.375H34.48l-2.508 12.375Z"/></svg>
                    <label className="text-sm text-gray-600">Nickname</label>
                  </div>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-start p-4">
                  <div className="flex items-start gap-3 w-32">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700 mt-1" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.478 3H7.25A2.25 2.25 0 0 0 5 5.25v13.5A2.25 2.25 0 0 0 7.25 21h9a2.25 2.25 0 0 0 2.25-2.25V12M9.478 3c1.243 0 2.272 1.007 2.272 2.25V7.5A2.25 2.25 0 0 0 14 9.75h2.25A2.25 2.25 0 0 1 18.5 12M9.478 3c3.69 0 9.022 5.36 9.022 9M9 16.5h6m-6-3h4"/></svg>
                    <label className="text-sm text-gray-600 pt-1">Bio</label>
                  </div>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    className="flex-1 text-sm text-gray-900 outline-none resize-none bg-transparent"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Online Presence</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <Globe className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Website</label>
                  </div>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="Website"
                    className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400 bg-transparent"
                  />
                </div>

                <div className="flex items-center p-4">
                  <div className="flex items-center gap-3 w-32">
                    <Users className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Social Links</label>
                  </div>
                  <button className="flex-1 flex items-center justify-end gap-2 text-sm text-gray-400">
                    <span>Add</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-3 px-2">Personal Details (Private)</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <Mail className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Email</label>
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="flex-1 text-sm text-gray-500 outline-none bg-transparent"
                  />
                </div>

                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <Phone className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Phone</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="flex-1 text-sm text-gray-900 outline-none text-left"
                  >
                    {formData.phone_nr || 'Add phone number'}
                  </button>
                </div>

                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 w-32">
                    <User className="w-5 h-5 text-gray-700" />
                    <label className="text-sm text-gray-600">Gender</label>
                  </div>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    placeholder="Male/Female/Other"
                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
                  />
                </div>

                <div className="flex items-center p-4">
                  <div className="flex items-center gap-3 w-32">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 56 56"><path fill="currentColor" d="M8.746 37.703h7.149l-2.133 10.594a4 4 0 0 0-.07.75c0 1.148.796 1.781 1.898 1.781c1.125 0 1.945-.61 2.18-1.758l2.296-11.367h11.086L29.02 48.297c-.07.234-.093.516-.093.75c0 1.148.797 1.781 1.922 1.781s1.945-.61 2.18-1.758L35.3 37.703h8.367c1.289 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875h-7.946L38.63 21.25h8.203c1.29 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875H39.45l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.82-1.805-1.945-1.805c-1.312 0-1.898.726-2.133 1.828l-2.062 10.172H24.215l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.844-1.805-1.945-1.805c-1.336 0-1.946.726-2.157 1.828l-2.062 10.172h-7.687c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805h7.289l-2.485 12.375h-7.57c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805m12.14-4.078l2.509-12.375H34.48l-2.508 12.375Z"/></svg>
                    <label className="text-sm text-gray-600">Age</label>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    max="150"
                    value={formData.age}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        handleChange('age', value);
                      }
                    }}
                    placeholder="Your age"
                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-red-500 mb-3 px-2">Dangerous Area</h2>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span className="text-red-500 font-medium">Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 z-20" style={{ paddingBottom: '14px' }}>
        <div className="w-full max-w-md mx-auto px-4 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-[1rem] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          userId={profile.user_id}
        />
      )}

      <PhoneNumberModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onSubmit={(phone, code) => {
          handleChange('phone_nr', phone);
          setIsPhoneModalOpen(false);
        }}
        initialPhone={(() => {
          const parsed = parsePhoneNumber(formData.phone_nr);
          return parsed ? parsed.localNumber : formData.phone_nr.replace(/^\+\d+/, '');
        })()}
        initialCountryCode={(() => {
          const parsed = parsePhoneNumber(formData.phone_nr);
          return parsed ? parsed.dialCode : '+31';
        })()}
      />
    </div>
  );
}

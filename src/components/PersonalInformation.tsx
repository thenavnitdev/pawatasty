import { ChevronLeft, Edit2, Instagram, Music, User, Hash, FileText, Globe, Users, Mail, Phone, UserCircle, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import EditProfile from './EditProfile';
import LinkIdModal from './LinkIdModal';
import { getProfileImageUrl } from '../utils/imageUtils';

interface PersonalInformationProps {
  onClose: () => void;
}

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
  current_level: number;
  link_id: string;
}

export default function PersonalInformation({ onClose }: PersonalInformationProps) {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLinkIdModal, setShowLinkIdModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('Loading profile for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error querying profile:', error);
        throw error;
      }

      console.log('Profile data loaded:', data);

      if (data) {
        setProfile(data);
      } else {
        console.log('No profile found, creating default profile object');
        setProfile({
          id: '',
          user_id: user.id,
          full_name: 'User',
          username: user.email?.split('@')[0] || 'user',
          email: user.email || '',
          phone_nr: '',
          gender: '',
          age: '',
          bio: '',
          website: '',
          profile_picture: '',
          instagram: '',
          tiktok: '',
          points_count: 0,
          saved_qty: '',
          current_level: 1,
          link_id: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    loadProfile();
    setShowEditProfile(false);
  };

  if (showEditProfile && profile) {
    return <EditProfile profile={profile} onClose={() => setShowEditProfile(false)} onSave={handleProfileUpdate} />;
  }

  if (showLinkIdModal) {
    return <LinkIdModal onClose={() => setShowLinkIdModal(false)} userLinkId={profile?.link_id} />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto bg-white">
          <div className="sticky top-0 bg-white z-10 px-4 py-4 flex items-center justify-between border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">My profile</h1>
            <button
              onClick={() => setShowEditProfile(true)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Edit2 className="w-5 h-5 text-gray-800" />
            </button>
          </div>

          <div className="px-4 py-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {profile.profile_picture ? (
                  <img
                    src={getProfileImageUrl(profile.profile_picture)}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-white text-3xl font-bold">${profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-white text-3xl font-bold">{profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
              </div>
            </div>

            {profile.link_id && (
              <button
                onClick={() => setShowLinkIdModal(true)}
                className="w-full bg-white rounded-2xl p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-gray-700" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-600 font-medium">Your Link ID</p>
                      <p className="text-lg font-bold text-gray-900 tracking-wider">{profile.link_id}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
                </div>
              </button>
            )}

            {(profile.username || profile.bio) && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                {profile.username && (
                  <div className="flex items-center p-4 border-b border-gray-100">
                    <Hash className="w-5 h-5 text-gray-700 mr-3" />
                    <span className="text-sm text-gray-600 w-28">Nickname</span>
                    <span className="flex-1 text-sm text-gray-900 text-right">{profile.username}</span>
                  </div>
                )}

                {profile.bio && (
                  <div className={`flex items-center p-4 ${profile.username ? '' : 'border-b-0'}`}>
                    <FileText className="w-5 h-5 text-gray-700 mr-3" />
                    <span className="text-sm text-gray-600 w-28">Bio</span>
                    <span className="flex-1 text-sm text-gray-900 text-right">{profile.bio}</span>
                  </div>
                )}
              </div>
            )}

            {(profile.website || profile.instagram || profile.tiktok) && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 px-2">Online Presence</h3>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  {profile.website && (
                    <div className={`flex items-center p-4 ${(profile.instagram || profile.tiktok) ? 'border-b border-gray-100' : ''}`}>
                      <Globe className="w-5 h-5 text-gray-700 mr-3" />
                      <span className="text-sm text-gray-600 w-28">Website</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">{profile.website}</span>
                    </div>
                  )}

                  {(profile.instagram || profile.tiktok) && (
                    <div className="flex items-center p-4">
                      <Users className="w-5 h-5 text-gray-700 mr-3" />
                      <span className="text-sm text-gray-600 w-28">Social Links</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {profile.instagram && (
                            <div className="flex items-center gap-1">
                              <Instagram className="w-4 h-4 text-pink-500" />
                              <span className="text-xs">{profile.instagram}</span>
                            </div>
                          )}
                          {profile.tiktok && (
                            <div className="flex items-center gap-1">
                              <Music className="w-4 h-4 text-gray-800" />
                              <span className="text-xs">{profile.tiktok}</span>
                            </div>
                          )}
                        </div>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(profile.email || profile.phone_nr || profile.gender || profile.age) && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 px-2">Personal Details (Private)</h3>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                  {profile.email && (
                    <div className={`flex items-center p-4 ${(profile.phone_nr || profile.gender || profile.age) ? 'border-b border-gray-100' : ''}`}>
                      <Mail className="w-5 h-5 text-gray-700 mr-3" />
                      <span className="text-sm text-gray-600 w-28">Email</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">{profile.email}</span>
                    </div>
                  )}

                  {profile.phone_nr && (
                    <div className={`flex items-center p-4 ${(profile.gender || profile.age) ? 'border-b border-gray-100' : ''}`}>
                      <Phone className="w-5 h-5 text-gray-700 mr-3" />
                      <span className="text-sm text-gray-600 w-28">Phone</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">{profile.phone_nr}</span>
                    </div>
                  )}

                  {profile.gender && (
                    <div className={`flex items-center p-4 ${profile.age ? 'border-b border-gray-100' : ''}`}>
                      <UserCircle className="w-5 h-5 text-gray-700 mr-3" />
                      <span className="text-sm text-gray-600 w-28">Gender</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">{profile.gender}</span>
                    </div>
                  )}

                  {profile.age && (
                    <div className="flex items-center p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700 mr-3" viewBox="0 0 56 56"><path fill="currentColor" d="M8.746 37.703h7.149l-2.133 10.594a4 4 0 0 0-.07.75c0 1.148.796 1.781 1.898 1.781c1.125 0 1.945-.61 2.18-1.758l2.296-11.367h11.086L29.02 48.297c-.07.234-.093.516-.093.75c0 1.148.797 1.781 1.922 1.781s1.945-.61 2.18-1.758L35.3 37.703h8.367c1.289 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875h-7.946L38.63 21.25h8.203c1.29 0 2.18-.937 2.18-2.203c0-1.031-.703-1.875-1.758-1.875H39.45l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.82-1.805-1.945-1.805c-1.312 0-1.898.726-2.133 1.828l-2.062 10.172H24.215l1.922-9.445c.023-.141.07-.446.07-.75c0-1.149-.844-1.805-1.945-1.805c-1.336 0-1.946.726-2.157 1.828l-2.062 10.172h-7.687c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805h7.289l-2.485 12.375h-7.57c-1.29 0-2.18.984-2.18 2.273c0 1.055.703 1.805 1.758 1.805m12.14-4.078l2.509-12.375H34.48l-2.508 12.375Z"/></svg>
                      <span className="text-sm text-gray-600 w-28">Age</span>
                      <span className="flex-1 text-sm text-gray-900 text-right">{profile.age}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

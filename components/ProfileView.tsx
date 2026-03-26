import React from 'react';
import { UserProfile } from '../types';
import { 
  User, Mail, Shield, Zap, 
  Settings, Camera, Save, RefreshCw 
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdate }) => {
  const [editing, setEditing] = React.useState(false);
  const [formData, setFormData] = React.useState(profile);

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 tracking-tighter">Neural Profile</h1>
        <p className="text-mirror-subtext">Manage your cognitive identity and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-matte rounded-[2.5rem] p-8 border border-mirror-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-mirror-accent to-mirror-accent/30 p-1">
                <div className="w-full h-full rounded-full bg-mirror-bg flex items-center justify-center overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-mirror-accent" />
                  )}
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-2.5 rounded-full bg-mirror-text text-mirror-bg shadow-xl hover:scale-110 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-mirror-text">{profile.name}</h2>
            <p className="text-xs text-mirror-subtext font-mono mt-1">{profile.email}</p>
            
            <div className="mt-8 w-full grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="block text-lg font-bold text-mirror-accent">Pro</span>
                <span className="text-[9px] font-bold text-mirror-subtext uppercase tracking-widest">Status</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="block text-lg font-bold text-mirror-accent">98%</span>
                <span className="text-[9px] font-bold text-mirror-subtext uppercase tracking-widest">Sync</span>
              </div>
            </div>
          </div>

          <div className="glass-matte rounded-[2.5rem] p-6 border border-mirror-border shadow-2xl">
            <h3 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4 px-2">System Access</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Shield className="w-4 h-4 text-mirror-accent" />
                <span className="text-xs text-mirror-text font-medium">Biometric Auth</span>
                <span className="ml-auto text-[9px] font-bold text-emerald-400 uppercase">Active</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Zap className="w-4 h-4 text-mirror-accent" />
                <span className="text-xs text-mirror-text font-medium">Neural Link</span>
                <span className="ml-auto text-[9px] font-bold text-emerald-400 uppercase">Stable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-matte rounded-[2.5rem] p-8 border border-mirror-border shadow-2xl h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-mirror-text flex items-center gap-3">
                <Settings className="w-5 h-5 text-mirror-accent" /> Identity Matrix
              </h3>
              <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${editing ? 'bg-mirror-accent text-white shadow-lg shadow-mirror-accent/20' : 'bg-white/5 text-mirror-text hover:bg-white/10'}`}
              >
                {editing ? <><Save className="w-3.5 h-3.5" /> Commit Changes</> : <><RefreshCw className="w-3.5 h-3.5" /> Reconfigure</>}
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Neural Handle</label>
                  <input 
                    type="text" 
                    disabled={!editing}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Communication Node</label>
                  <input 
                    type="email" 
                    disabled={!editing}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest px-1">Cognitive Bio</label>
                <textarea 
                  disabled={!editing}
                  rows={4}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent transition-all disabled:opacity-50 resize-none"
                  placeholder="Describe your neural architecture..."
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-mirror-subtext uppercase tracking-widest mb-4">Preference Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs font-medium text-mirror-text">Neural Feedback</span>
                      <div className="w-10 h-5 rounded-full bg-mirror-accent relative">
                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white" />
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-xs font-medium text-mirror-text">Deep Sync</span>
                      <div className="w-10 h-5 rounded-full bg-white/10 relative">
                        <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white" />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

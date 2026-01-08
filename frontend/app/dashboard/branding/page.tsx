'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentApi } from '@/lib/api';

export default function BrandingPage() {
  const { token, agent, refreshAgent } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    photoUrl: '',
    brandColor: '#1a1a2e',
    logoUrl: '',
    socialLinks: '',
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        fullName: agent.fullName || '',
        phone: agent.phone || '',
        photoUrl: agent.photoUrl || '',
        brandColor: agent.brandColor || '#1a1a2e',
        logoUrl: agent.logoUrl || '',
        socialLinks: agent.socialLinks || '',
      });
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSaved(false);

    try {
      await agentApi.updateMe(token!, formData);
      await refreshAgent();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to update branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="text-muted-foreground">
          Personnalisez l'apparence de vos pages client
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Ces informations sont visibles par vos clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <Input
                placeholder="Jean Dupont"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telephone</label>
              <Input
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL de votre photo</label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.photoUrl}
                onChange={(e) => handleChange('photoUrl', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Identite visuelle</CardTitle>
            <CardDescription>Couleurs et logo de votre agence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Couleur principale</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={formData.brandColor}
                  onChange={(e) => handleChange('brandColor', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.brandColor}
                  onChange={(e) => handleChange('brandColor', e.target.value)}
                  placeholder="#1a1a2e"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">URL de votre logo</label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social links */}
        <Card>
          <CardHeader>
            <CardTitle>Reseaux sociaux</CardTitle>
            <CardDescription>Liens vers vos profils (format JSON)</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm font-mono"
              placeholder='{"instagram": "https://...", "linkedin": "https://..."}'
              value={formData.socialLinks}
              onChange={(e) => handleChange('socialLinks', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Apercu</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="p-6 rounded-lg text-white"
              style={{ backgroundColor: formData.brandColor }}
            >
              <div className="flex items-center gap-4">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Photo"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                    {formData.fullName?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-lg">{formData.fullName || 'Votre nom'}</p>
                  <p className="opacity-80">{formData.phone || 'Votre telephone'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          {isSaved && (
            <p className="text-green-500 self-center">Modifications enregistrees !</p>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

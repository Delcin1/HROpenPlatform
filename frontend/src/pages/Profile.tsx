import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Grid,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { ProfileService } from '../api/profile';
import type { ApiGetProfile, ApiUpdateProfile } from '../api/profile';

export const Profile = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error: profileError } = useQuery<ApiGetProfile>({
    queryKey: ['profile'],
    queryFn: () => ProfileService.fetchOwnProfile(),
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ApiUpdateProfile) => ProfileService.storeOwnProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
      setError('');
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Ошибка при обновлении профиля');
      setSuccess(false);
    },
  });

  const [formData, setFormData] = useState<ApiUpdateProfile>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        description: profile.description,
        phone: profile.phone,
        email: profile.email,
        birthdate: profile.birthdate,
        gender: profile.gender,
        avatar: profile.avatar,
        cv: profile.cv,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (profileError) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {profileError instanceof Error ? profileError.message : 'Ошибка при загрузке профиля'}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Профиль
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Профиль успешно обновлен
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ФИО"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Дата рождения"
                name="birthdate"
                type="date"
                value={formData.birthdate || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Пол"
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
              >
                <MenuItem value="male">Мужской</MenuItem>
                <MenuItem value="female">Женский</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Аватар"
                name="avatar"
                value={formData.avatar || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Резюме"
                name="cv"
                value={formData.cv || ''}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}; 
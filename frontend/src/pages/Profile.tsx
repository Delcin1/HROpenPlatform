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
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Add as AddIcon } from '@mui/icons-material';
import { ProfileService } from '../api/profile';
import type { ApiGetProfile, ApiUpdateProfile, Experience } from '../api/profile';

interface ExperienceFormData {
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
}

export const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExperienceDialogOpen, setIsExperienceDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const [experienceFormData, setExperienceFormData] = useState<ExperienceFormData>({
    company_name: '',
    position: '',
    start_date: '',
    end_date: '',
  });

  const { data: profile, isLoading, error: profileError } = useQuery<ApiGetProfile>({
    queryKey: ['profile'],
    queryFn: () => ProfileService.fetchOwnProfile(),
    retry: false,
  });

  const { data: experience, isLoading: experienceLoading } = useQuery<Experience[]>({
    queryKey: ['experience'],
    queryFn: () => ProfileService.fetchOwnExperience(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ApiUpdateProfile) => ProfileService.storeOwnProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      setSuccess(true);
      setError('');
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Ошибка при обновлении профиля');
      setSuccess(false);
    },
  });

  const updateExperienceMutation = useMutation({
    mutationFn: (data: Experience) => ProfileService.storeOwnExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience'] });
      setIsExperienceDialogOpen(false);
      setExperienceFormData({
        company_name: '',
        position: '',
        start_date: '',
        end_date: '',
      });
      setSuccess(true);
      setError('');
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Ошибка при добавлении опыта работы');
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

  const handleExperienceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExperienceFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddExperience = () => {
    const newExperience: Experience = {
      company_name: experienceFormData.company_name,
      position: experienceFormData.position,
      start_date: experienceFormData.start_date,
      end_date: experienceFormData.end_date || undefined,
    };

    updateExperienceMutation.mutate(newExperience);
  };

  if (isLoading || experienceLoading) {
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

      {/* Profile Header */}
      <Paper sx={{ p: 3, mb: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={profile?.avatar}
            sx={{ width: 120, height: 120, mr: 3 }}
          />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h4" gutterBottom>
                {profile?.description}
              </Typography>
              <IconButton color="primary" onClick={() => setIsEditing(true)}>
                <EditIcon />
              </IconButton>
            </Box>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profile?.company_name && `Работает в ${profile.company_name}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile?.email}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Телефон: {profile?.phone}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Дата рождения: {profile?.birthdate}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Пол: {profile?.gender === 'male' ? 'Мужской' : 'Женский'}
            </Typography>
          </Grid>
          {profile?.cv && (
            <Grid item xs={12}>
              <Button
                variant="outlined"
                href={profile.cv}
                target="_blank"
                rel="noopener noreferrer"
              >
                Скачать резюме
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Experience Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Опыт работы
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsExperienceDialogOpen(true)}
          >
            Добавить опыт
          </Button>
        </Box>

        {experience && experience.length > 0 ? (
          <List>
            {experience.map((exp: Experience, index: number) => (
              <ListItem key={index} divider={index < experience.length - 1}>
                <ListItemText
                  primary={exp.company_name}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {exp.position}
                      </Typography>
                      <br />
                      {exp.start_date} - {exp.end_date || 'Настоящее время'}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            Опыт работы не указан
          </Typography>
        )}
      </Paper>

      {/* Add Experience Dialog */}
      <Dialog open={isExperienceDialogOpen} onClose={() => setIsExperienceDialogOpen(false)}>
        <DialogTitle>Добавить опыт работы</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название компании"
                name="company_name"
                value={experienceFormData.company_name}
                onChange={handleExperienceChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Должность"
                name="position"
                value={experienceFormData.position}
                onChange={handleExperienceChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Дата начала"
                name="start_date"
                type="date"
                value={experienceFormData.start_date}
                onChange={handleExperienceChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Дата окончания"
                name="end_date"
                type="date"
                value={experienceFormData.end_date}
                onChange={handleExperienceChange}
                InputLabelProps={{ shrink: true }}
                helperText="Оставьте пустым, если работаете по настоящее время"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsExperienceDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleAddExperience}
            variant="contained"
            disabled={!experienceFormData.company_name || !experienceFormData.position || !experienceFormData.start_date}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      {isEditing && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Редактирование профиля
            </Typography>
            <Box>
              <IconButton color="primary" onClick={handleSubmit} sx={{ mr: 1 }}>
                <SaveIcon />
              </IconButton>
              <IconButton color="error" onClick={() => {
                setIsEditing(false);
                setFormData({
                  description: profile?.description,
                  phone: profile?.phone,
                  email: profile?.email,
                  birthdate: profile?.birthdate,
                  gender: profile?.gender,
                  avatar: profile?.avatar,
                  cv: profile?.cv,
                });
              }}>
                <CancelIcon />
              </IconButton>
            </Box>
          </Box>

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
          </Grid>
        </Paper>
      )}
    </Container>
  );
}; 
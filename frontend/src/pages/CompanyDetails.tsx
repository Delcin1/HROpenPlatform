import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { CompanyService } from '../api/company';
import type { ApiGetCompany, ApiUpdateCompany } from '../api/company';

export const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery<ApiGetCompany>({
    queryKey: ['company', id],
    queryFn: () => CompanyService.fetchCompany(id!),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data: ApiUpdateCompany) => CompanyService.updateCompanyProfile(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      setIsEditing(false);
      setSuccess(true);
      setError('');
    },
    onError: () => {
      setError('Ошибка при обновлении компании');
      setSuccess(false);
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: () => CompanyService.deleteCompany(id!),
    onSuccess: () => {
      navigate('/companies');
    },
    onError: () => {
      setError('Ошибка при удалении компании');
    },
  });

  const [formData, setFormData] = useState<ApiUpdateCompany>({});

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        description: company.description,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        avatar: company.avatar,
        short_link_name: company.short_link_name,
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту компанию?')) {
      deleteCompanyMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!company) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          Компания не найдена
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant="h4" component="h1">
            {isEditing ? 'Редактирование компании' : company.name}
          </Typography>
          <Box>
            {!isEditing ? (
              <>
                <IconButton
                  color="primary"
                  onClick={() => setIsEditing(true)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  color="primary"
                  onClick={handleSubmit}
                  sx={{ mr: 1 }}
                >
                  <SaveIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: company.name,
                      description: company.description,
                      address: company.address,
                      phone: company.phone,
                      email: company.email,
                      website: company.website,
                      avatar: company.avatar,
                      short_link_name: company.short_link_name,
                    });
                  }}
                >
                  <CancelIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Box>

        <Paper elevation={3} sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Компания успешно обновлена
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название компании"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                disabled={!isEditing}
                multiline
                rows={4}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Адрес"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Веб-сайт"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ссылка на логотип"
                name="avatar"
                value={formData.avatar || ''}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Короткое название"
                name="short_link_name"
                value={formData.short_link_name || ''}
                onChange={handleChange}
                disabled={!isEditing}
                helperText="Используется для создания короткой ссылки на профиль компании"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
}; 
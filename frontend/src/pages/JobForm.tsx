import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Container,
  Stack,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  CurrencyRuble as CurrencyRubleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { JobService } from '../api/job/services/JobService';
import { CreateJobRequest } from '../api/job/models/CreateJobRequest';
import { UpdateJobRequest } from '../api/job/models/UpdateJobRequest';
import { Job } from '../api/job/models/Job';

interface JobFormData {
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  salary_from: string;
  salary_to: string;
  description: string;
  requirements: string;
  status?: string;
}

export const JobForm = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const isEdit = !!jobId;
  
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company_name: '',
    location: '',
    employment_type: 'full-time',
    salary_from: '',
    salary_to: '',
    description: '',
    requirements: '',
    status: 'active',
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load job data for editing
  useEffect(() => {
    if (isEdit && jobId) {
      loadJobData();
    }
  }, [isEdit, jobId]);

  const loadJobData = async () => {
    if (!jobId) return;

    try {
      setInitialLoading(true);
      setError(null);
      
      const response = await JobService.getJobById(jobId);
      const job = response.job;
      
      setFormData({
        title: job.title,
        company_name: job.company_name,
        location: job.location,
        employment_type: job.employment_type,
        salary_from: job.salary_from?.toString() || '',
        salary_to: job.salary_to?.toString() || '',
        description: job.description,
        requirements: job.requirements,
        status: job.status,
      });
    } catch (err) {
      console.error('Error loading job data:', err);
      setError('Ошибка загрузки данных вакансии');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: keyof JobFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Название вакансии обязательно';
    }

    if (!formData.company_name.trim()) {
      errors.company_name = 'Название компании обязательно';
    }

    if (!formData.location.trim()) {
      errors.location = 'Местоположение обязательно';
    }

    if (!formData.description.trim()) {
      errors.description = 'Описание вакансии обязательно';
    }

    if (!formData.requirements.trim()) {
      errors.requirements = 'Требования обязательны';
    }

    if (formData.salary_from && isNaN(Number(formData.salary_from))) {
      errors.salary_from = 'Зарплата должна быть числом';
    }

    if (formData.salary_to && isNaN(Number(formData.salary_to))) {
      errors.salary_to = 'Зарплата должна быть числом';
    }

    if (formData.salary_from && formData.salary_to) {
      const from = Number(formData.salary_from);
      const to = Number(formData.salary_to);
      if (from > to) {
        errors.salary_to = 'Максимальная зарплата не может быть меньше минимальной';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const jobData = {
        title: formData.title.trim(),
        company_name: formData.company_name.trim(),
        location: formData.location.trim(),
        employment_type: formData.employment_type as UpdateJobRequest.employment_type,
        salary_from: formData.salary_from ? Number(formData.salary_from) : undefined,
        salary_to: formData.salary_to ? Number(formData.salary_to) : undefined,
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
      };

      if (isEdit && jobId) {
        const updateData: UpdateJobRequest = {
          ...jobData,
          status: formData.status! as UpdateJobRequest.status,
        };
        await JobService.updateJob(jobId, updateData);
      } else {
        await JobService.createJob(jobData as CreateJobRequest);
      }

      navigate('/jobs/my');
    } catch (err) {
      console.error('Error saving job:', err);
      setError(isEdit ? 'Ошибка обновления вакансии' : 'Ошибка создания вакансии');
    } finally {
      setLoading(false);
    }
  };

  const employmentTypes = [
    { value: 'full-time', label: 'Полная занятость' },
    { value: 'part-time', label: 'Частичная занятость' },
    { value: 'contract', label: 'Контракт' },
    { value: 'internship', label: 'Стажировка' },
    { value: 'remote', label: 'Удаленная работа' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Активна' },
    { value: 'paused', label: 'На паузе' },
    { value: 'closed', label: 'Закрыта' },
  ];

  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/jobs/my')}
          sx={{ mb: 2 }}
        >
          Назад к моим вакансиям
        </Button>
        
        <Typography variant="h4" component="h1">
          {isEdit ? 'Редактировать вакансию' : 'Создать вакансию'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Basic Information */}
              <Typography variant="h6" gutterBottom>
                Основная информация
              </Typography>

              <TextField
                fullWidth
                label="Название вакансии"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={!!validationErrors.title}
                helperText={validationErrors.title}
                required
              />

              <TextField
                fullWidth
                label="Название компании"
                value={formData.company_name}
                onChange={handleInputChange('company_name')}
                error={!!validationErrors.company_name}
                helperText={validationErrors.company_name}
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Местоположение"
                    value={formData.location}
                    onChange={handleInputChange('location')}
                    error={!!validationErrors.location}
                    helperText={validationErrors.location}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Тип занятости</InputLabel>
                    <Select
                      value={formData.employment_type}
                      label="Тип занятости"
                      onChange={handleInputChange('employment_type')}
                    >
                      {employmentTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Salary */}
              <Typography variant="h6" gutterBottom>
                Зарплата
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Зарплата от"
                    value={formData.salary_from}
                    onChange={handleInputChange('salary_from')}
                    error={!!validationErrors.salary_from}
                    helperText={validationErrors.salary_from}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <CurrencyRubleIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Зарплата до"
                    value={formData.salary_to}
                    onChange={handleInputChange('salary_to')}
                    error={!!validationErrors.salary_to}
                    helperText={validationErrors.salary_to}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <CurrencyRubleIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              {/* Description */}
              <Typography variant="h6" gutterBottom>
                Описание
              </Typography>

              <TextField
                fullWidth
                label="Описание вакансии"
                value={formData.description}
                onChange={handleInputChange('description')}
                error={!!validationErrors.description}
                helperText={validationErrors.description}
                multiline
                rows={4}
                required
                placeholder="Опишите вакансию, обязанности, условия работы..."
              />

              <TextField
                fullWidth
                label="Требования"
                value={formData.requirements}
                onChange={handleInputChange('requirements')}
                error={!!validationErrors.requirements}
                helperText={validationErrors.requirements}
                multiline
                rows={4}
                required
                placeholder="Укажите требования к кандидату: опыт, навыки, образование..."
              />

              {/* Status (only for edit) */}
              {isEdit && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Статус
                  </Typography>

                  <FormControl fullWidth>
                    <InputLabel>Статус вакансии</InputLabel>
                    <Select
                      value={formData.status}
                      label="Статус вакансии"
                      onChange={handleInputChange('status')}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}

              {/* Submit Button */}
              <Box display="flex" gap={2} justifyContent="flex-end" pt={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/jobs/my')}
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                >
                  {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                  {isEdit ? 'Сохранить изменения' : 'Создать вакансию'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};


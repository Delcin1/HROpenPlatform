import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Pagination,
  Container,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { JobService } from '../api/job/services/JobService';
import { Job } from '../api/job/models/Job';

export const Jobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const loadJobs = async (searchTerm?: string, pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (pageNum - 1) * limit;
      const response = await JobService.getAllJobs(searchTerm, limit, offset);
      
      setJobs(response);
      // Assuming we get full response, calculate total pages based on response length
      // In real scenario, you'd get total count from API
      setTotalPages(Math.ceil(response.length / limit) || 1);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Ошибка загрузки вакансий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(search, page);
  }, [search, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatSalary = (salaryFrom?: number, salaryTo?: number) => {
    if (!salaryFrom && !salaryTo) return 'З/п не указана';
    if (salaryFrom && salaryTo) return `${salaryFrom.toLocaleString()} - ${salaryTo.toLocaleString()} ₽`;
    if (salaryFrom) return `от ${salaryFrom.toLocaleString()} ₽`;
    if (salaryTo) return `до ${salaryTo.toLocaleString()} ₽`;
    return 'З/п не указана';
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Полная занятость',
      'part-time': 'Частичная занятость',
      'contract': 'Контракт',
      'internship': 'Стажировка',
      'remote': 'Удаленная работа',
    };
    return labels[type] || type;
  };

  const getEmploymentTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning'> = {
      'full-time': 'primary',
      'part-time': 'secondary',
      'contract': 'info',
      'internship': 'warning',
      'remote': 'success',
    };
    return colors[type] || 'primary';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Вакансии
      </Typography>

      {/* Search Form */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Поиск вакансий по названию, компании или описанию..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button type="submit" variant="contained" sx={{ mr: -1 }}>
                  Поиск
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Jobs List */}
      {!loading && (
        <Grid container spacing={3}>
          {jobs.map((job) => (
            <Grid item xs={12} key={job.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
                onClick={() => handleJobClick(job.id)}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {job.title}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {job.company_name}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {job.location}
                          </Typography>
                        </Box>
                      </Box>
                      <Box textAlign="right">
                        <Chip
                          label={getEmploymentTypeLabel(job.employment_type)}
                          color={getEmploymentTypeColor(job.employment_type)}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <Box display="flex" alignItems="center" gap={1}>
                          <PaymentIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {formatSalary(job.salary_from || undefined, job.salary_to || undefined)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Description Preview */}
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {job.description}
                    </Typography>

                    {/* Date */}
                    <Typography variant="caption" color="text.secondary">
                      Опубликовано: {new Date(job.created_at).toLocaleDateString('ru-RU')}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!loading && jobs.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Вакансии не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Попробуйте изменить параметры поиска
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {!loading && jobs.length > 0 && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
}; 
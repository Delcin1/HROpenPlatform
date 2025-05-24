import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { CompanyService } from '../api/company';
import type { ApiSearchCompanyResp } from '../api/company';

export const Companies = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<ApiSearchCompanyResp>({
    queryKey: ['companies', searchQuery],
    queryFn: async () => {
      console.log('Searching with query:', searchQuery);
      const response = await CompanyService.searchCompanyByName(searchQuery || '');
      console.log('Raw API Response:', response);
      // Адаптируем ответ под ожидаемый формат
      return { companies: Array.isArray(response) ? response : [] };
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  console.log('Current data:', data);
  console.log('Data type:', typeof data);
  console.log('Companies array:', data?.companies);
  console.log('Is loading:', isLoading);
  console.log('Error:', error);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Компании
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/companies/new')}
          >
            Добавить компанию
          </Button>
        </Box>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box component="form" onSubmit={handleSearch}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <TextField
                  fullWidth
                  label="Поиск компаний"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Введите название компании"
                />
              </Grid>
              <Grid item>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                >
                  Поиск
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Ошибка при загрузке компаний
          </Alert>
        )}

        {!isLoading && (!data?.companies || data.companies.length === 0) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Компании не найдены
          </Alert>
        )}

        {!isLoading && data?.companies && data.companies.length > 0 && (
          <Grid container spacing={3}>
            {data.companies.map((company) => (
              <Grid item xs={12} sm={6} md={4} key={company.guid}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {company.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {company.short_link_name}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(`/companies/${company.guid}`)}
                    >
                      Подробнее
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}; 
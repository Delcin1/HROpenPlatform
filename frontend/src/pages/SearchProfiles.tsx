import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ProfileService } from '../api/profile';
import type { ApiSearchProfileResp } from '../api/profile';

export const SearchProfiles = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [error] = useState('');

  const { data: searchResult, isLoading, error: searchError } = useQuery<ApiSearchProfileResp>({
    queryKey: ['searchProfiles', searchQuery],
    queryFn: () => ProfileService.searchProfileByDescription(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Триггер поиска через изменение searchQuery
      setSearchQuery(searchQuery.trim());
    }
  };

  const handleProfileClick = (guid: string) => {
    navigate(`/profile/${guid}`);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Поиск профилей
        </Typography>

        <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Поиск по ФИО"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите ФИО для поиска"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!searchQuery.trim()}
            >
              Поиск
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {searchError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {searchError instanceof Error ? searchError.message : 'Ошибка при поиске профилей'}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : searchResult?.profiles && searchResult.profiles.length > 0 ? (
          <List>
            {searchResult.profiles.map((profile) => (
              <ListItem
                key={profile.guid}
                button
                onClick={() => handleProfileClick(profile.guid)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar />
                </ListItemAvatar>
                <ListItemText
                  primary={profile.description}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {profile.company_name && `Работает в ${profile.company_name}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : searchQuery ? (
          <Typography color="text.secondary" align="center">
            Профили не найдены
          </Typography>
        ) : null}
      </Paper>
    </Container>
  );
}; 
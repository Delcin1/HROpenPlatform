import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  IconButton,
} from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { ProfileService } from '../api/profile';
import { ChatService } from '../api/chat';
import type { ApiSearchProfileResp } from '../api/profile';

export const SearchProfiles = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const { data: searchResult, isLoading, error: searchError } = useQuery<ApiSearchProfileResp>({
    queryKey: ['searchProfiles', searchQuery],
    queryFn: () => ProfileService.searchProfileByDescription(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const createChatMutation = useMutation({
    mutationFn: async (users: string[]) => {
      const response = await ChatService.createChat({ users });
      console.log('Create chat response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Chat created successfully:', data);
      try {
        // Если data это строка, пытаемся распарсить её как JSON
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Parsed chat data:', parsedData);
        
        if (parsedData && typeof parsedData === 'object' && 'id' in parsedData) {
          navigate(`/chat?chatId=${parsedData.id}`);
        } else {
          console.error('Invalid chat data received:', parsedData);
          setError('Ошибка: не удалось получить ID чата');
        }
      } catch (error) {
        console.error('Error parsing chat data:', error);
        setError('Ошибка: не удалось обработать ответ сервера');
      }
    },
    onError: (error: any) => {
      console.error('Error creating chat:', error);
      setError(error.response?.data?.message || 'Ошибка при создании чата');
    },
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

  const handleStartChat = (e: React.MouseEvent, guid: string) => {
    e.stopPropagation();
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Ошибка: требуется авторизация');
      return;
    }

    // Декодируем JWT токен
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserGuid = payload.user_guid;
      
      if (!currentUserGuid) {
        setError('Ошибка: не удалось получить ID пользователя из токена');
        return;
      }

      createChatMutation.mutate([currentUserGuid, guid]);
    } catch (error) {
      console.error('Error decoding token:', error);
      setError('Ошибка: не удалось прочитать токен авторизации');
    }
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
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => handleStartChat(e, profile.guid)}
                    disabled={createChatMutation.isPending}
                  >
                    <ChatIcon />
                  </IconButton>
                }
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
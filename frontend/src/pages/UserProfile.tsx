import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Grid,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Button,
} from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { DefaultService } from '../api/profile';
import { ChatService } from '../api/chat';
import type { ApiGetProfile, Experience } from '../api/profile';

export const UserProfile = () => {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data: profile, isLoading, error: profileError } = useQuery<ApiGetProfile>({
    queryKey: ['profile', guid],
    queryFn: () => DefaultService.getProfileByGuid(guid!),
    enabled: !!guid,
  });

  const { data: experience, isLoading: experienceLoading } = useQuery<Experience[]>({
    queryKey: ['experience', guid],
    queryFn: () => DefaultService.getExperienceByGuid(guid!),
    enabled: !!guid,
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

  const handleStartChat = () => {
    if (guid) {
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
    }
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

      {/* Profile Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
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
              <Button
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={handleStartChat}
                disabled={createChatMutation.isPending}
              >
                {createChatMutation.isPending ? 'Создание чата...' : 'Написать сообщение'}
              </Button>
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
        <Typography variant="h5" sx={{ mb: 3 }}>
          Опыт работы
        </Typography>

        {experience && experience.length > 0 ? (
          <List>
            {experience.map((exp: Experience, index: number) => (
              <ListItem 
                key={index} 
                divider={index < experience.length - 1}
              >
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
    </Container>
  );
}; 
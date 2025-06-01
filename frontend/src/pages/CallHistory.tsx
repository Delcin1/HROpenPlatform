import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import { Phone as PhoneIcon, AccessTime as AccessTimeIcon, People as PeopleIcon } from '@mui/icons-material';
import { CallService } from '../api/call';
import type { CallWithTranscript } from '../api/call';

export const CallHistory = () => {
  const [calls, setCalls] = useState<CallWithTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallWithTranscript | null>(null);

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const response = await CallService.getCallHistory();
      setCalls(response);
    } catch (err) {
      setError('Ошибка загрузки истории звонков');
      console.error('Error loading call history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'Активный';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCallStatusChip = (call: CallWithTranscript['call']) => {
    switch (call.status) {
      case 'active':
        return <Chip label="Активный" color="success" size="small" />;
      case 'ended':
        return <Chip label="Завершен" color="default" size="small" />;
      default:
        return <Chip label={call.status} color="default" size="small" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Загрузка истории звонков...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={loadCallHistory}>
              Попробовать снова
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          История звонков
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Просмотр прошлых видеозвонков и их транскриптов
        </Typography>
      </Box>

      {calls.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <PhoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Нет истории звонков
          </Typography>
          <Typography color="text.secondary">
            Ваши видеозвонки будут отображаться здесь
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Список звонков */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
              <List sx={{ p: 0 }}>
                {calls.map((callWithTranscript, index) => {
                  const { call, transcript } = callWithTranscript;
                  const isSelected = selectedCall?.call.id === call.id;
                  
                  return (
                    <React.Fragment key={call.id}>
                      <ListItem
                        button
                        selected={isSelected}
                        onClick={() => setSelectedCall(callWithTranscript)}
                        sx={{ 
                          py: 2,
                          px: 3,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          ...(isSelected && {
                            backgroundColor: 'primary.light',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                            },
                          }),
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          {/* Участники и информация о звонке */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AvatarGroup max={3} sx={{ mr: 2 }}>
                              {call.participants.map((participant, idx) => (
                                <Avatar
                                  key={participant.id}
                                  sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                                  title={participant.description}
                                >
                                  {participant.description.charAt(0).toUpperCase()}
                                </Avatar>
                              ))}
                            </AvatarGroup>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" noWrap>
                                {call.participants.length === 2 
                                  ? call.participants.find(p => p.id !== 'current-user')?.description || 'Звонок'
                                  : `Групповой звонок (${call.participants.length} участников)`
                                }
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(call.created_at).toLocaleString('ru-RU')}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Статус и длительность */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            {getCallStatusChip(call)}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatDuration(call.created_at, call.ended_at ?? undefined)}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Превью транскрипта */}
                          {transcript.length > 0 && (
                            <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {transcript[0].text}
                                {transcript.length > 1 && '...'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {transcript.length} сообщений в транскрипте
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                      {index < calls.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Детали выбранного звонка */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
              {selectedCall ? (
                <Box sx={{ p: 3 }}>
                  {/* Заголовок деталей */}
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Детали звонка
                  </Typography>
                  
                  {/* Информация о звонке */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Дата:</strong> {new Date(selectedCall.call.created_at).toLocaleString('ru-RU')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Длительность:</strong> {formatDuration(selectedCall.call.created_at, selectedCall.call.ended_at ?? undefined)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PeopleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>Участники:</strong> {selectedCall.call.participants.map(p => p.description).join(', ')}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  {/* Транскрипт */}
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Транскрипт разговора
                  </Typography>
                  
                  {selectedCall.transcript.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        Транскрипт недоступен
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {selectedCall.transcript.map((entry, index) => (
                        <Card key={index} variant="outlined" sx={{ mb: 2, borderLeft: 3, borderLeftColor: 'primary.main' }}>
                          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                                {entry.user.description.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mr: 1 }}>
                                {entry.user.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(entry.timestamp).toLocaleTimeString('ru-RU')}
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {entry.text}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  textAlign: 'center',
                  p: 3 
                }}>
                  <PhoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Выберите звонок
                  </Typography>
                  <Typography color="text.secondary">
                    Нажмите на звонок слева, чтобы просмотреть детали и транскрипт
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}; 
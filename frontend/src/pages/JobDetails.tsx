import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Stack,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  Grid,
  Paper,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  CheckCircleOutline as AcceptIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Star as StarIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { JobService } from '../api/job/services/JobService';
import { CvService } from '../api/cv/services/CvService';
import type { JobDetails as JobDetailsType } from '../api/job/models/JobDetails';
import { JobApplication } from '../api/job/models/JobApplication';
import { UpdateApplicationStatusRequest } from '../api/job/models/UpdateApplicationStatusRequest';
import type { MatchCandidatesResponse } from '../api/cv/models/MatchCandidatesResponse';
import type { MatchedCandidate } from '../api/cv/models/MatchedCandidate';

export const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [jobDetails, setJobDetails] = useState<JobDetailsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [matchedCandidates, setMatchedCandidates] = useState<MatchedCandidate[]>([]);

  const loadJobDetails = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await JobService.getJobById(jobId);
      setJobDetails(response);
    } catch (err) {
      console.error('Error loading job details:', err);
      setError('Ошибка загрузки вакансии');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const handleApply = async () => {
    if (!jobId) return;

    try {
      setApplyLoading(true);
      await JobService.applyToJob(jobId);
      setApplyDialogOpen(true);
      await loadJobDetails(); // Refresh to update application status
    } catch (err) {
      console.error('Error applying to job:', err);
      setError('Ошибка отправки отклика');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, application: JobApplication) => {
    setAnchorEl(event.currentTarget);
    setSelectedApplication(application);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApplication(null);
  };

  const handleViewProfile = (profileId: string) => {
    navigate(`/profiles/${profileId}`);
    handleMenuClose();
  };

  const handleAcceptApplication = async (application: JobApplication) => {
    if (!jobId) return;

    try {
      await JobService.updateJobApplicationStatus(
        jobId, 
        application.applicant_id, 
        { status: UpdateApplicationStatusRequest.status.ACCEPTED }
      );
      await loadJobDetails(); // Refresh to show updated status
      handleMenuClose();
    } catch (err) {
      console.error('Error accepting application:', err);
      setError('Ошибка при принятии заявки');
    }
  };

  const handleRejectApplication = async (application: JobApplication) => {
    if (!jobId) return;

    try {
      await JobService.updateJobApplicationStatus(
        jobId, 
        application.applicant_id, 
        { status: UpdateApplicationStatusRequest.status.REJECTED }
      );
      await loadJobDetails(); // Refresh to show updated status
      handleMenuClose();
    } catch (err) {
      console.error('Error rejecting application:', err);
      setError('Ошибка при отклонении заявки');
    }
  };

  const handleMatchCandidates = async () => {
    if (!jobId) return;

    try {
      setMatchLoading(true);
      setError(null);
      
      const response: MatchCandidatesResponse = await CvService.matchCandidatesFromDatabase(jobId);
      setMatchedCandidates(response.candidates);
      setMatchDialogOpen(true);
    } catch (err) {
      console.error('Error matching candidates:', err);
      setError('Ошибка подбора кандидатов. Возможно, у вас нет базы резюме.');
    } finally {
      setMatchLoading(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
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

  const getApplicationStatusChip = (status: string) => {
    const statusConfig = {
      pending: { label: 'На рассмотрении', color: 'warning' as const },
      reviewed: { label: 'Просмотрено', color: 'info' as const },
      accepted: { label: 'Принято', color: 'success' as const },
      rejected: { label: 'Отклонено', color: 'error' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!jobDetails) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Вакансия не найдена</Alert>
      </Container>
    );
  }

  const { job, is_author, can_apply, has_applied, applications } = jobDetails;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Job Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Title and Status */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Typography variant="h4" component="h1" gutterBottom>
                  {job.title}
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <BusinessIcon color="action" />
                  <Typography variant="h6" color="text.secondary">
                    {job.company_name}
                  </Typography>
                </Box>
              </Box>
              {!is_author && (
                <Box>
                  {can_apply && (
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={handleApply}
                      disabled={applyLoading}
                    >
                      {applyLoading ? 'Отправка...' : 'Откликнуться'}
                    </Button>
                  )}
                  {has_applied && (
                    <Button
                      variant="outlined"
                      startIcon={<CheckCircleIcon />}
                      disabled
                    >
                      Вы уже оставили отклик
                    </Button>
                  )}
                  {!can_apply && !has_applied && (
                    <Button variant="outlined" disabled>
                      Недоступно для отклика
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            {/* Job Details */}
            <Box display="flex" gap={4} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={1}>
                <LocationIcon color="action" />
                <Typography variant="body1">{job.location}</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentIcon color="action" />
                <Typography variant="body1">
                  {formatSalary(job.salary_from || undefined, job.salary_to || undefined)}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon color="action" />
                <Chip
                  label={getEmploymentTypeLabel(job.employment_type)}
                  color={getEmploymentTypeColor(job.employment_type)}
                />
              </Box>
            </Box>

            {/* Dates */}
            <Typography variant="body2" color="text.secondary">
              Опубликовано: {new Date(job.created_at).toLocaleDateString('ru-RU')}
              {job.updated_at !== job.created_at && (
                <> • Обновлено: {new Date(job.updated_at).toLocaleDateString('ru-RU')}</>
              )}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Job Description */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Описание вакансии
          </Typography>
          <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
            {job.description}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Требования
          </Typography>
          <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
            {job.requirements}
          </Typography>
        </CardContent>
      </Card>

      {/* Applications (for job author) */}
      {is_author && applications && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Отклики ({applications.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={matchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleMatchCandidates}
                disabled={matchLoading}
              >
                {matchLoading ? 'Подбираем...' : 'Подобрать кандидата из моей базы'}
              </Button>
            </Box>
            
            {applications.length === 0 ? (
              <Box textAlign="center" py={4}>
                <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Пока нет откликов на эту вакансию
                </Typography>
              </Box>
            ) : (
              <List>
                {applications.map((application, index) => (
                  <React.Fragment key={application.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar src={application.applicant_profile.avatar || undefined}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={application.applicant_profile.description}
                        secondary={
                          <Stack spacing={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <EmailIcon fontSize="small" />
                              <Typography variant="body2">
                                {application.applicant_profile.email}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body2" color="text.secondary">
                                Подал отклик: {new Date(application.applied_at).toLocaleDateString('ru-RU')}
                              </Typography>
                              {getApplicationStatusChip(application.status)}
                            </Box>
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          onClick={(e) => handleMenuClick(e, application)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < applications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Success Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)}>
        <DialogTitle>Отклик отправлен</DialogTitle>
        <DialogContent>
          <Typography>
            Ваш отклик успешно отправлен работодателю. 
            Он получит уведомление и сможет связаться с вами.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialogOpen(false)} variant="contained">
            Понятно
          </Button>
        </DialogActions>
      </Dialog>

      {/* Matched Candidates Dialog */}
      <Dialog open={matchDialogOpen} onClose={() => setMatchDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <StarIcon color="primary" />
            Подобранные кандидаты
          </Box>
        </DialogTitle>
        <DialogContent>
          {matchedCandidates.length === 0 ? (
            <Box textAlign="center" py={4}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Подходящие кандидаты не найдены
              </Typography>
              <Typography color="text.secondary">
                Попробуйте загрузить больше резюме в базу или измените требования к вакансии
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {matchedCandidates.map((candidate, index) => (
                <Grid item xs={12} key={candidate.resume_id}>
                  <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {candidate.candidate_name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Chip
                            label={`${candidate.match_score}% соответствие`}
                            color={getMatchScoreColor(candidate.match_score)}
                            size="small"
                          />
                          <Typography variant="body2" color="text.secondary">
                            #{index + 1} кандидат
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => window.open(candidate.file_url, '_blank')}
                      >
                        Резюме
                      </Button>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Почему подходит:
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {candidate.reasoning}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)}>Закрыть</Button>
          <Button 
            variant="contained" 
            onClick={() => navigate('/resume-database')}
          >
            Перейти к базе резюме
          </Button>
        </DialogActions>
      </Dialog>

      {/* Application Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedApplication) {
            handleViewProfile(selectedApplication.applicant_profile.id);
          }
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          Посмотреть профиль
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedApplication) {
            handleAcceptApplication(selectedApplication);
          }
        }}>
          <ListItemIcon>
            <AcceptIcon fontSize="small" />
          </ListItemIcon>
          Принять
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedApplication) {
            handleRejectApplication(selectedApplication);
          }
        }}>
          <ListItemIcon>
            <RejectIcon fontSize="small" />
          </ListItemIcon>
          Отклонить
        </MenuItem>
      </Menu>
    </Container>
  );
}; 
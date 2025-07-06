'use client'

import { useEffect, useState } from 'react'
import { useTaskSubscription } from '@/hooks/useTaskSubscription'
import { Card, Text, Progress, Badge, Stack, Group, Button, ScrollArea } from '@mantine/core'
import { IconCheck, IconX, IconClock, IconRefresh } from '@tabler/icons-react'

interface TaskStatusProps {
  taskId?: string
  userId?: string
  showAll?: boolean
}

export function TaskStatus({ taskId, userId, showAll = false }: TaskStatusProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(taskId || null)
  
  const { tasks, loading, error } = useTaskSubscription({
    taskId: showAll ? undefined : taskId,
    userId,
    onUpdate: (task) => {
      console.log('Task updated:', task)
    },
    onComplete: (task) => {
      console.log('Task completed:', task)
    },
    onError: (task) => {
      console.error('Task failed:', task)
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'gray'
      case 'queued':
        return 'blue'
      case 'processing':
        return 'yellow'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <IconCheck size={16} />
      case 'failed':
        return <IconX size={16} />
      case 'processing':
        return <IconRefresh size={16} className="animate-spin" />
      default:
        return <IconClock size={16} />
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <Card>
        <Text>Loading tasks...</Text>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Text c="red">Error loading tasks: {error.message}</Text>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <Text c="dimmed">No tasks found</Text>
      </Card>
    )
  }

  // If showing a single task
  if (!showAll && tasks.length === 1) {
    const task = tasks[0]
    return (
      <Card>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Task {task.type}</Text>
            <Badge
              color={getStatusColor(task.status)}
              leftSection={getStatusIcon(task.status)}
            >
              {task.status}
            </Badge>
          </Group>

          {task.progress > 0 && (
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Progress: {Math.round(task.progress * 100)}%
              </Text>
              <Progress value={task.progress * 100} color={getStatusColor(task.status)} />
            </div>
          )}

          {task.current_round && (
            <Text size="sm">
              Round: {task.current_round} / {task.config?.rounds || '?'}
            </Text>
          )}

          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              Created: {formatDate(task.created_at)}
            </Text>
            {task.started_at && (
              <Text size="xs" c="dimmed">
                Started: {formatDate(task.started_at)}
              </Text>
            )}
            {task.completed_at && (
              <Text size="xs" c="dimmed">
                Completed: {formatDate(task.completed_at)}
              </Text>
            )}
          </Stack>

          {task.error && (
            <Card bg="red.1" p="sm">
              <Text size="sm" c="red">
                Error: {task.error}
              </Text>
            </Card>
          )}

          {task.result && (
            <Card bg="gray.0" p="sm">
              <Text size="sm" fw={500} mb="xs">
                Result:
              </Text>
              <ScrollArea h={200}>
                <pre style={{ fontSize: '0.75rem', margin: 0 }}>
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </ScrollArea>
            </Card>
          )}
        </Stack>
      </Card>
    )
  }

  // If showing multiple tasks
  return (
    <Stack gap="md">
      {tasks.map((task) => (
        <Card
          key={task.id}
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedTask(task.id === selectedTask ? null : task.id)}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="sm">
                <Text fw={600}>{task.type}</Text>
                <Text size="xs" c="dimmed">
                  {task.id.slice(0, 8)}...
                </Text>
              </Group>
              <Badge
                color={getStatusColor(task.status)}
                leftSection={getStatusIcon(task.status)}
              >
                {task.status}
              </Badge>
            </Group>

            {task.progress > 0 && (
              <Progress value={task.progress * 100} color={getStatusColor(task.status)} size="sm" />
            )}

            <Text size="xs" c="dimmed">
              {formatDate(task.created_at)}
            </Text>

            {selectedTask === task.id && (
              <>
                {task.error && (
                  <Card bg="red.1" p="sm">
                    <Text size="sm" c="red">
                      Error: {task.error}
                    </Text>
                  </Card>
                )}

                {task.result && (
                  <Card bg="gray.0" p="sm">
                    <Text size="sm" fw={500} mb="xs">
                      Result:
                    </Text>
                    <ScrollArea h={200}>
                      <pre style={{ fontSize: '0.75rem', margin: 0 }}>
                        {JSON.stringify(task.result, null, 2)}
                      </pre>
                    </ScrollArea>
                  </Card>
                )}
              </>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
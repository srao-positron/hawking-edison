'use client'

import { useState } from 'react'
import { Container, Title, Stack, Card, Button, TextInput, Select, NumberInput, Textarea, Group, Alert } from '@mantine/core'
import { TaskStatus } from '@/components/TaskStatus'
import { useAuth } from '@/hooks/useAuth'
import { IconInfoCircle } from '@tabler/icons-react'

export default function TasksPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state
  const [taskType, setTaskType] = useState<string>('simulation')
  const [topic, setTopic] = useState('')
  const [agents, setAgents] = useState(3)
  const [rounds, setRounds] = useState(2)

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to create tasks')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let config: any = {}
      
      switch (taskType) {
        case 'simulation':
          config = {
            agents,
            topic,
            rounds,
          }
          break
        case 'panel':
          config = {
            panelists: Array(agents).fill(0).map((_, i) => `Expert ${i + 1}`),
            topic,
            duration: 30,
          }
          break
        case 'discussion':
          config = {
            participants: Array(agents).fill(0).map((_, i) => `Participant ${i + 1}`),
            topic,
            style: 'debate',
          }
          break
        case 'analysis':
          config = {
            data: { topic },
            analysisType: 'comprehensive',
            provider: 'anthropic',
          }
          break
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: taskType,
          config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      const data = await response.json()
      setSuccess(`Task created successfully! ID: ${data.task.id}`)
      
      // Clear form
      setTopic('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<IconInfoCircle />} title="Authentication Required">
          Please log in to create and view tasks.
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title>Task Management</Title>

        <Card withBorder>
          <Stack gap="md">
            <Title order={3}>Create New Task</Title>
            
            <Select
              label="Task Type"
              value={taskType}
              onChange={(value) => setTaskType(value || 'simulation')}
              data={[
                { value: 'simulation', label: 'Simulation' },
                { value: 'panel', label: 'Panel Discussion' },
                { value: 'discussion', label: 'Discussion' },
                { value: 'analysis', label: 'Analysis' },
              ]}
            />

            <TextInput
              label="Topic"
              placeholder="Enter the topic for the task"
              value={topic}
              onChange={(e) => setTopic(e.currentTarget.value)}
              required
            />

            {(taskType === 'simulation' || taskType === 'panel' || taskType === 'discussion') && (
              <NumberInput
                label="Number of Agents/Participants"
                value={agents}
                onChange={(value) => setAgents(Number(value) || 3)}
                min={2}
                max={10}
              />
            )}

            {taskType === 'simulation' && (
              <NumberInput
                label="Number of Rounds"
                value={rounds}
                onChange={(value) => setRounds(Number(value) || 2)}
                min={1}
                max={10}
              />
            )}

            {error && (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            )}

            {success && (
              <Alert color="green" title="Success">
                {success}
              </Alert>
            )}

            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!topic}
            >
              Create Task
            </Button>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="md">
            <Title order={3}>Your Tasks</Title>
            <TaskStatus userId={user.id} showAll />
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}
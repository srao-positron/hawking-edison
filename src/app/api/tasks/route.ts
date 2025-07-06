import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { z } from 'zod'
import { cookies } from 'next/headers'

// Initialize SNS client
const snsClient = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new SNSClient({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null

// Task schema
const taskSchema = z.object({
  type: z.enum(['simulation', 'panel', 'discussion', 'analysis']),
  config: z.record(z.any()),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = taskSchema.parse(body)

    // Create task record in database
    const { data: task, error: dbError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        type: validatedData.type,
        config: validatedData.config,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    // Send task to SNS for processing
    if (snsClient && process.env.SNS_TOPIC_ARN) {
      try {
        const message = {
          id: task.id,
          userId: user.id,
          type: task.type,
          config: task.config,
          createdAt: task.created_at,
        }

        const command = new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: JSON.stringify(message),
          MessageAttributes: {
            taskType: {
              DataType: 'String',
              StringValue: task.type,
            },
            userId: {
              DataType: 'String',
              StringValue: user.id,
            },
          },
        })

        await snsClient.send(command)
      } catch (snsError) {
        console.error('SNS error:', snsError)
        
        // Update task status to failed
        await supabase
          .from('tasks')
          .update({ status: 'failed', error: 'Failed to queue task' })
          .eq('id', task.id)

        return NextResponse.json(
          { error: 'Failed to queue task for processing' },
          { status: 500 }
        )
      }
    } else {
      // If SNS is not configured, just log a warning
      console.warn('SNS not configured - task will remain in pending state')
      console.log('Task created:', task.id)
    }

    // Return task details
    return NextResponse.json({
      task: {
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.created_at,
      },
      message: 'Task queued for processing',
    })
  } catch (error) {
    console.error('Task creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get task status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (taskId) {
      // Get specific task
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single()

      if (error || !task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ task })
    } else {
      // Get all user's tasks
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch tasks' },
          { status: 500 }
        )
      }

      return NextResponse.json({ tasks })
    }
  } catch (error) {
    console.error('Task fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
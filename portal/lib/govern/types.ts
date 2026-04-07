// lib/govern/types.ts

export type ArtifactLevel = 'strategic' | 'tactical' | 'operational'
export type ArtifactStatus = 'draft' | 'ready' | 'in_progress' | 'done' | 'cancelled' | 'blocked'
export type ActorType = 'human' | 'agent'
export type MetricStatus = 'pending' | 'on_track' | 'at_risk' | 'achieved' | 'missed'
export type ValueType =
  | 'revenue_impact'
  | 'cost_reduction'
  | 'risk_mitigation'
  | 'strategic_positioning'
  | 'user_acquisition'

export interface Artifact {
  id: string
  project_id: string
  parent_id: string | null
  type_slug: string
  type_label: string
  level: ArtifactLevel
  title: string
  description: string | null
  body: string | null
  status: ArtifactStatus
  priority: 1 | 2 | 3 | 4
  assignee_id: string | null
  assignee_name: string | null
  assignee_type: ActorType | null
  due_date: string | null
  sort_order: number
  tags: string[]
  metadata: Record<string, unknown>
  business_value: number | null
  value_type: ValueType | null
  value_note: string | null
  parent_title: string | null
  parent_type: string | null
  project_name: string
  metric_count: number
  metrics_ok: number
  last_action: string | null
  last_action_at: string | null
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  artifact_id: string
  name: string
  description: string | null
  target: number | null
  actual: number | null
  unit: string | null
  status: MetricStatus
  measured_at: string | null
}

export interface ExecutionLog {
  id: string
  artifact_id: string
  actor_id: string | null
  actor_type: ActorType
  actor_name: string | null
  action: string
  previous_value: unknown
  new_value: unknown
  note: string | null
  logged_at: string
}

export interface ArtifactType {
  slug: string
  level: ArtifactLevel
  label: string
  description: string | null
  icon: string | null
}
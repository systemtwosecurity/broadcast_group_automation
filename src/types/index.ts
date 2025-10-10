// User types
export interface User {
  id: string;
  email: string;
  password?: string;
}

export interface AdminUser {
  email: string;
  password?: string;
}

export interface UsersConfig {
  admin: AdminUser;
  users: User[];
}

// Group types
export interface GroupConfig {
  id: string;
  name: string;
  description: string;
  group: {
    name: string;
    description: string;
    type: string;
    settings: {
      allow_comments: boolean;
      notification_preferences: {
        new_member: boolean;
      };
    };
    unlisted: boolean;
  };
  source: {
    integration_type: string;
    name: string;
    description: string;
    connection_config: {
      repository: string;
      branch?: string;
      root_path?: string;
    };
    pipeline_id?: string;
    pipeline_config?: {
      include_patterns?: string[];
      exclude_patterns?: string[];
      run_validation?: boolean;
      run_static_parsing?: boolean;
      run_ai_enrichment?: boolean;
      run_job_status?: boolean;
    };
    processing_config: {
      auto_sync: boolean;
      group_id: string;
    };
    credentials: {
      public: boolean;
    };
  };
}

export interface GroupsConfig {
  groups: GroupConfig[];
}

// Environment types
export type Environment = 'dev' | 'qa' | 'prod';

// Operation types
export type OperationType = 'invite' | 'create_group' | 'create_source' | 'setup';
export type OperationStatus = 'success' | 'failed' | 'skipped';

// Database types
export interface UserStatus {
  invited: boolean;
  groupCreated: boolean;
  sourceCreated: boolean;
  groupApiId: string | null;
  sourceApiId: string | null;
}

export interface AllStatus {
  user_id: string;
  email: string;
  invited: boolean | number;
  group_created: boolean | number;
  group_api_id: string | null;
  source_created: boolean | number;
}

// API Response types
export interface InvitationResponse {
  data?: {
    invitations?: string[];
  };
}

export interface GroupResponse {
  data: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

export interface SourceResponse {
  data: {
    id?: string;
    source_id?: string;
    [key: string]: any;
  };
}

// Workflow options
export interface WorkflowOptions {
  groupIds?: string[] | null;
}


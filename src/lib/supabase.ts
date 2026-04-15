/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Demo mode: Mock Supabase client
  console.log('Running in demo mode with mock Supabase client')
  supabase = createMockSupabase()
}

function createMockSupabase() {
  const mockUsers: any[] = []
  const mockPosts: any[] = []
  let currentUser: any = null
  const listeners: any[] = []

  return {
    auth: {
      onAuthStateChange: (callback: any) => {
        // Simulate initial load
        setTimeout(() => callback('SIGNED_IN', { user: currentUser }), 100)
        return {
          data: { subscription: { unsubscribe: () => {} } }
        }
      },
      signInWithOAuth: async () => {
        currentUser = {
          id: 'demo-user-id',
          email: 'demo@example.com',
          user_metadata: { full_name: 'Demo User' }
        }
        return { error: null }
      },
      signUp: async ({ email, password, options }: any) => {
        const user = {
          id: `user-${Date.now()}`,
          email,
          user_metadata: { full_name: options?.data?.full_name || email.split('@')[0] }
        }
        mockUsers.push(user)
        currentUser = user
        return { error: null }
      },
      signInWithPassword: async ({ email, password }: any) => {
        const user = mockUsers.find(u => u.email === email) || {
          id: `user-${Date.now()}`,
          email,
          user_metadata: { full_name: email.split('@')[0] }
        }
        if (!mockUsers.find(u => u.email === email)) {
          mockUsers.push(user)
        }
        currentUser = user
        return { error: null }
      },
      signOut: async () => {
        currentUser = null
        return { error: null }
      },
      getUser: async () => ({ data: { user: currentUser } })
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (col: string, val: any) => ({
          single: async () => {
            if (table === 'users') {
              const user = mockUsers.find(u => u.uid === val)
              return { data: user, error: null }
            }
            return { data: null, error: null }
          }
        }),
        order: (col: string, options: any) => ({
          limit: (num: number) => ({
            single: async () => ({ data: null, error: null }),
            then: async (callback: any) => {
              if (table === 'posts') {
                const data = mockPosts.slice().sort((a, b) => 
                  options.ascending ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)
                ).slice(0, num)
                callback({ data, error: null })
              }
            }
          })
        })
      }),
      insert: (data: any) => ({
        then: async (callback: any) => {
          if (table === 'users') {
            mockUsers.push(data)
          } else if (table === 'posts') {
            const post = { ...data, id: `post-${Date.now()}` }
            mockPosts.push(post)
            // Notify listeners
            listeners.forEach(listener => {
              if (listener.table === 'posts') {
                listener.callback({ eventType: 'INSERT', new: post })
              }
            })
          }
          callback({ error: null })
        }
      }),
      upsert: (data: any) => ({
        then: async (callback: any) => {
          if (table === 'users') {
            const existing = mockUsers.find(u => u.uid === data.uid)
            if (existing) {
              Object.assign(existing, data)
            } else {
              mockUsers.push(data)
            }
          }
          callback({ error: null })
        }
      })
    }),
    channel: (name: string) => ({
      on: (event: string, options: any, callback: any) => ({
        subscribe: () => {
          listeners.push({ table: options.table, callback })
          return { unsubscribe: () => {} }
        }
      })
    }),
    removeChannel: () => {}
  }
}

export { supabase }

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailConfirmedAt: string | null | undefined;
    phone: string | null | undefined;
    confirmedAt: string | null | undefined;
    lastSignInAt: string | null | undefined;
    appMetadata: any;
    userMetadata: any;
    aud: string;
    createdAt: string;
  }
}

export function handleSupabaseError(error: any, operationType: OperationType, table: string | null) {
  console.error('Supabase Error: ', { error: error?.message || String(error), operationType, table });
  throw new Error(error?.message || 'Supabase error');
}

export async function testSupabaseConnection() {
  try {
    // In demo mode, always return true
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return true
    }
    const { data, error } = await supabase.from('users').select('count').limit(1).single()
    if (error) throw error
    console.log("Supabase connection verified.");
    return true;
  } catch (error) {
    console.error("Supabase connection failed:", error);
    return false;
  }
}
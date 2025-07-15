import { prisma } from '@/config/database';
import { Permission } from '@/shared/types/auth.types';

export class RoleService {
  async assignDefaultRole(userId: string): Promise<void> {
    // 獲取默認用戶角色
    const defaultRole = await this.getOrCreateDefaultRole();
    
    // 分配角色給用戶
    await prisma.userRole.create({
      data: {
        userId,
        roleId: defaultRole.id
      }
    });
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // 檢查是否已經分配
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id
        }
      }
    });

    if (existingAssignment) {
      throw new Error('Role already assigned to user');
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id
      }
    });
  }

  async removeRole(userId: string, roleName: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id
        }
      }
    });
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });

    for (const userRole of userRoles) {
      const permissions = userRole.role.permissions as Permission[];
      
      for (const permission of permissions) {
        if (permission.resource === resource && permission.action === action) {
          return true;
        }
        
        // 檢查通配符權限
        if (permission.resource === '*' && permission.action === action) {
          return true;
        }
        
        if (permission.resource === resource && permission.action === '*') {
          return true;
        }
        
        if (permission.resource === '*' && permission.action === '*') {
          return true;
        }
      }
    }

    return false;
  }

  async createRole(name: string, description: string, permissions: Permission[]): Promise<void> {
    await prisma.role.create({
      data: {
        name,
        description,
        permissions
      }
    });
  }

  async updateRolePermissions(roleName: string, permissions: Permission[]): Promise<void> {
    await prisma.role.update({
      where: { name: roleName },
      data: { permissions }
    });
  }

  async deleteRole(roleName: string): Promise<void> {
    // 檢查是否有用戶使用此角色
    const usersWithRole = await prisma.userRole.count({
      where: {
        role: { name: roleName }
      }
    });

    if (usersWithRole > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    await prisma.role.delete({
      where: { name: roleName }
    });
  }

  private async getOrCreateDefaultRole() {
    let defaultRole = await prisma.role.findUnique({
      where: { name: 'USER' }
    });

    if (!defaultRole) {
      defaultRole = await prisma.role.create({
        data: {
          name: 'USER',
          description: '默認用戶角色',
          permissions: [
            { resource: 'texts', action: 'read' },
            { resource: 'annotations', action: 'create' },
            { resource: 'annotations', action: 'read' },
            { resource: 'annotations', action: 'update' },
            { resource: 'annotations', action: 'delete' }
          ]
        }
      });
    }

    return defaultRole;
  }

  async initializeRoles(): Promise<void> {
    const roles = [
      {
        name: 'ADMIN',
        description: '系統管理員',
        permissions: [
          { resource: '*', action: '*' }
        ]
      },
      {
        name: 'MODERATOR',
        description: '內容審核員',
        permissions: [
          { resource: 'texts', action: '*' },
          { resource: 'annotations', action: '*' },
          { resource: 'users', action: 'read' }
        ]
      },
      {
        name: 'EDITOR',
        description: '編輯員',
        permissions: [
          { resource: 'texts', action: 'create' },
          { resource: 'texts', action: 'read' },
          { resource: 'texts', action: 'update' },
          { resource: 'annotations', action: '*' }
        ]
      },
      {
        name: 'USER',
        description: '普通用戶',
        permissions: [
          { resource: 'texts', action: 'read' },
          { resource: 'annotations', action: 'create' },
          { resource: 'annotations', action: 'read' },
          { resource: 'annotations', action: 'update' },
          { resource: 'annotations', action: 'delete' }
        ]
      }
    ];

    for (const role of roles) {
      const existing = await prisma.role.findUnique({
        where: { name: role.name }
      });

      if (!existing) {
        await prisma.role.create({
          data: role
        });
      }
    }
  }
} 
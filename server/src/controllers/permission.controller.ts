import type { Request, Response } from 'express';
import type { IUser } from '@/models/User.ts';
import { PermissionService } from '@/services/permission.service.ts';
import { ShareLinkService } from '@/services/share-link.service.ts';
import { ImportService } from '@/services/import.service.ts';
import { ENV } from '@/config/environment.ts';
import Permission from '@/models/Permission.ts';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import TestModel from '@/models/Test.ts';

export class PermissionController {

  static async grant(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId, email, userId } = req.body;
      const user = req.user as IUser;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const permission = await PermissionService.grant({
        resourceType,
        resourceId,
        invitedBy: (user._id as any).toString(),
        userId,
        email,
      });
      res.status(201).json(permission);
    } catch (error: any) {
      if (error.message === 'Only the resource owner can share content' ||
          error.message === 'User already has access to this resource') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error granting access', error });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { resourceType, resourceId } = req.query;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const permissions = await PermissionService.listForResource(
        resourceType as any,
        resourceId as string,
        (user._id as any).toString()
      );
      res.json(permissions);
    } catch (error: any) {
      if (error.message === 'Only the resource owner can view permissions') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error listing permissions', error });
    }
  }

  static async revoke(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const id = req.params.id as string;
      const permission = await PermissionService.revoke(id, (user._id as any).toString());
      if (!permission) { res.status(404).json({ message: 'Permission not found' }); return; }
      res.json({ message: 'Access revoked', permission });
    } catch (error: any) {
      if (error.message === 'Only the resource owner can revoke access') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error revoking access', error });
    }
  }

  static async createShareLink(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId, expiresAt, maxUses } = req.body;
      const user = req.user as IUser;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const params: { resourceType: any; resourceId: any; createdBy: string; expiresAt?: Date; maxUses?: number } = {
        resourceType,
        resourceId,
        createdBy: (user._id as any).toString(),
      };
      if (expiresAt) params.expiresAt = new Date(expiresAt);
      if (maxUses !== undefined) params.maxUses = maxUses;

      const link = await ShareLinkService.create(params);
      res.status(201).json({
        ...link.toObject(),
        url: `${ENV.CLIENT_URL}/shared/${link.hash}`,
      });
    } catch (error: any) {
      if (error.message === 'Only the resource owner can create share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error creating share link', error });
    }
  }

  static async listShareLinks(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { resourceType, resourceId } = req.query;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const links = await ShareLinkService.listForResource(
        resourceType as any,
        resourceId as string,
        (user._id as any).toString()
      );
      res.json(links.map(l => ({
        ...l.toObject(),
        url: `${ENV.CLIENT_URL}/shared/${l.hash}`,
      })));
    } catch (error: any) {
      if (error.message === 'Only the resource owner can view share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error listing share links', error });
    }
  }

  static async deactivateShareLink(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const id = req.params.id as string;
      const link = await ShareLinkService.deactivate(id, (user._id as any).toString());
      if (!link) { res.status(404).json({ message: 'Share link not found' }); return; }
      res.json({ message: 'Share link deactivated', link });
    } catch (error: any) {
      if (error.message === 'Only the resource owner can deactivate share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error deactivating share link', error });
    }
  }

  static async resolveShareLink(req: Request, res: Response): Promise<void> {
    try {
      const hash = req.params.hash as string;
      const { resourceType, resourceId } = await ShareLinkService.resolve(hash);

      const modelMap: Record<string, any> = {
        space: Space,
        subject: Subject,
        topic: Topic,
        test: TestModel,
      };
      const Model = modelMap[resourceType];
      let resource: any = { _id: resourceId };
      if (Model) {
        if (resourceType === 'subject') {
          resource = await Model.findById(resourceId, 'title slug spaceId').lean() || resource;
        } else if (resourceType === 'topic') {
          resource = await Model.findById(resourceId, 'title slug subjectId').lean() || resource;
        } else if (resourceType === 'test') {
          resource = await Model.findById(resourceId, 'title').lean() || resource;
        } else {
          resource = await Model.findById(resourceId, 'name slug').lean() || resource;
        }
      }

      let spaceSlug: string | null = null;
      let subjectSlug: string | null = null;

      if (resourceType === 'subject' && resource?.spaceId) {
        const space = await Space.findById(resource.spaceId, 'slug').lean();
        if (space) spaceSlug = (space as any).slug;
      } else if (resourceType === 'topic' && resource?.subjectId) {
        const subject = await Subject.findById(resource.subjectId, 'slug spaceId').lean();
        if (subject) {
          subjectSlug = (subject as any).slug;
          const space = await Space.findById((subject as any).spaceId, 'slug').lean();
          if (space) spaceSlug = (space as any).slug;
        }
      }

      res.json({ resourceType, resourceId, resource, spaceSlug, subjectSlug });
    } catch (error: any) {
      if (error.message.includes('not found') ||
          error.message.includes('expired') ||
          error.message.includes('maximum uses')) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error resolving share link', error });
    }
  }

  static async redeemShareLink(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const hash = req.params.hash as string;
      await ShareLinkService.redeem(hash, (user._id as any).toString());
      res.json({ message: 'Access granted via share link' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getSharedResources(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const userId = (user._id as any).toString();

      const permissions = await Permission.find({ userId, status: 'active' })
        .populate('invitedBy', 'name email avatar')
        .sort({ createdAt: -1 });

      const grouped: Record<string, any[]> = {
        space: [], subject: [], topic: [], contentBlock: [], test: [],
      };

      const modelMap: Record<string, any> = {
        space: Space,
        subject: Subject,
        topic: Topic,
        test: TestModel,
      };

      for (const perm of permissions) {
        const Model = modelMap[perm.resourceType];
        if (!Model) continue;

        let resource: any;
        if (perm.resourceType === 'subject') {
          resource = await Model.findById(perm.resourceId, 'title slug spaceId').lean();
        } else if (perm.resourceType === 'topic') {
          resource = await Model.findById(perm.resourceId, 'title slug subjectId').lean();
        } else {
          resource = await Model.findById(perm.resourceId, 'name title slug question').lean();
        }
        if (!resource) continue;

        let spaceSlug: string | null = null;
        let subjectSlug: string | null = null;

        if (perm.resourceType === 'subject' && resource.spaceId) {
          const space = await Space.findById(resource.spaceId, 'slug').lean();
          if (space) spaceSlug = (space as any).slug;
        } else if (perm.resourceType === 'topic' && resource.subjectId) {
          const subject = await Subject.findById(resource.subjectId, 'slug spaceId').lean();
          if (subject) {
            subjectSlug = (subject as any).slug;
            const space = await Space.findById((subject as any).spaceId, 'slug').lean();
            if (space) spaceSlug = (space as any).slug;
          }
        }

        grouped[perm.resourceType]!.push({
          permissionId: perm._id,
          resourceId: perm.resourceId,
          resource,
          spaceSlug,
          subjectSlug,
          sharedBy: perm.invitedBy,
          sharedAt: perm.createdAt,
        });
      }

      res.json(grouped);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching shared resources', error });
    }
  }

  static async getSharedTest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const testId = req.params.id as string;

      const hasAccess = await PermissionService.hasAccess(
        (user._id as any).toString(), 'test', testId
      );
      if (!hasAccess) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const test = await TestModel.findById(testId)
        .select('-questions.userAnswer -questions.isCorrect -questions.marksObtained -score -warnings');

      if (!test) {
        res.status(404).json({ message: 'Test not found' });
        return;
      }

      res.json(test);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching shared test', error });
    }
  }

  static async importSpace(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const space = await ImportService.importSpace(
        (user._id as any).toString(), req.params.id as string
      );
      res.status(201).json(space);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing space', error });
    }
  }

  static async importSubject(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { targetSpaceId } = req.body;

      if (!targetSpaceId) {
        res.status(400).json({ message: 'targetSpaceId is required' });
        return;
      }

      const subject = await ImportService.importSubject(
        (user._id as any).toString(), req.params.id as string, targetSpaceId
      );
      res.status(201).json(subject);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing subject', error });
    }
  }

  static async importTopic(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { targetSubjectId } = req.body;

      if (!targetSubjectId) {
        res.status(400).json({ message: 'targetSubjectId is required' });
        return;
      }

      const topic = await ImportService.importTopic(
        (user._id as any).toString(), req.params.id as string, targetSubjectId
      );
      res.status(201).json(topic);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing topic', error });
    }
  }

  static async takeTest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const test = await ImportService.takeTest(
        (user._id as any).toString(), req.params.id as string
      );
      res.status(201).json(test);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error taking test', error });
    }
  }
}

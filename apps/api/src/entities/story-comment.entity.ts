import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Story } from './story.entity';
import { User } from './user.entity';

@Entity('story_comments')
@Index(['storyId'])
export class StoryComment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') storyId!: string;
  @Column('uuid') userId!: string;
  @Column({ type: 'text' }) content!: string;
  @CreateDateColumn() createdAt!: Date;
  @ManyToOne(() => Story, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'storyId' }) story!: Story;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { Story } from './story.entity';
import { User } from './user.entity';

@Entity('story_likes')
@Unique(['storyId', 'userId'])
export class StoryLike {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') storyId!: string;
  @Column('uuid') userId!: string;
  @CreateDateColumn() createdAt!: Date;
  @ManyToOne(() => Story, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'storyId' }) story!: Story;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
}

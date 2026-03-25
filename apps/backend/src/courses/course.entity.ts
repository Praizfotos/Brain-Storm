import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { CourseModule } from './course-module.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: 'beginner' })
  level: string;

  @Column({ default: 0 })
  durationHours: number;

  @Column({ default: true })
  isPublished: boolean;

  @OneToMany(() => CourseModule, (m) => m.course)
  modules: CourseModule[];

  @CreateDateColumn()
  createdAt: Date;
}

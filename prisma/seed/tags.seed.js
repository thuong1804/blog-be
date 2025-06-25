import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTags() {
  const tags = [
    'JavaScript', 'TypeScript', 'Python', 'AI', 'Ethics', 'VR', 'Design', 'Blockchain', 'Security',
    'Cloud', 'IaaS', 'PaaS', 'SaaS', 'DevOps', 'CI/CD', 'Kubernetes', 'Containers',
    'Machine Learning', 'Neural Networks', 'Data Science', 'Frontend', 'UI/UX',
    'Backend', 'Node.js', 'Fullstack', 'Web Development', 'Network Security',
    'Cybersecurity', 'Application Security', 'Ethical Hacking'
  ];
  for (const tag of tags) {
    const existingTag = await prisma.tag.findUnique({ where: { name: tag } });
    if (existingTag) {
      console.log(`Tag already exists: ${tag}`);
    } else {
      await prisma.tag.create({
        data: { name: tag },
      });
      console.log(`✅ Created tag: ${tag}`);
    }
  }
}

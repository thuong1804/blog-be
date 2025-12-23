import { PrismaClient } from "@prisma/client";
const additionalPostsData = [
    {
        title: "Introduction to Cloud Computing",
        slug: "intro-cloud-computing",
        content: `
## Introduction to Cloud Computing

Cloud computing revolutionizes how we store and process data. Learn the basics here.

### Key Concepts

- Infrastructure as a Service (IaaS)
- Platform as a Service (PaaS)
- Software as a Service (SaaS)

![Cloud Computing](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796001/cloud_intro.jpg)

\`\`\`bash
# Deploy an app to the cloud
aws deploy --app my-app
\`\`\`

Start leveraging cloud services for scalable applications.
    `.trim(),
        description: "A beginner’s guide to cloud computing concepts.",
        excerpt: "Discover the fundamentals of cloud computing.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796001/cloud_intro.jpg",
        category: "Cloud",
        tags: ["Cloud", "IaaS", "PaaS", "SaaS"],
    },
    {
        title: "DevOps Best Practices",
        slug: "devops-best-practices",
        content: `
## DevOps Best Practices

DevOps bridges development and operations for faster delivery. Explore best practices.

### Core Practices

- Continuous Integration
- Continuous Deployment
- Infrastructure as Code

![DevOps Workflow](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796002/devops_workflow.jpg)

\`\`\`yaml
name: CI Pipeline
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
\`\`\`

Adopt DevOps to streamline your workflows.
    `.trim(),
        description: "Best practices for implementing DevOps.",
        excerpt: "Learn how to optimize DevOps processes.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796002/devops_workflow.jpg",
        category: "DevOps",
        tags: ["DevOps", "CI/CD"],
    },
    {
        title: "Scaling with Kubernetes",
        slug: "scaling-kubernetes",
        content: `
## Scaling with Kubernetes

Kubernetes simplifies container orchestration. Learn how to scale applications.

### Key Features

- Pods and Deployments
- Service Discovery
- Autoscaling

![Kubernetes Cluster](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796003/k8s_cluster.jpg)

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
\`\`\`

Master Kubernetes for scalable deployments.
    `.trim(),
        description: "Guide to scaling applications with Kubernetes.",
        excerpt: "Scale efficiently with Kubernetes.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796003/k8s_cluster.jpg",
        category: "Kubernetes",
        tags: ["Kubernetes", "Containers"],
    },
    {
        title: "Machine Learning Fundamentals",
        slug: "machine-learning-fundamentals",
        content: `
## Machine Learning Fundamentals

Machine learning enables systems to learn from data. Start with the basics.

### Core Concepts

- Supervised Learning
- Unsupervised Learning
- Model Evaluation

![ML Pipeline](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796004/ml_pipeline.jpg)

\`\`\`python
from sklearn.linear_model import LinearRegression
model = LinearRegression()
model.fit(X_train, y_train)
\`\`\`

Begin your machine learning journey today.
    `.trim(),
        description: "An introduction to machine learning concepts.",
        excerpt: "Learn the basics of machine learning.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796004/ml_pipeline.jpg",
        category: "Machine Learning",
        tags: ["Machine Learning", "AI"],
    },
    {
        title: "Deep Learning with Neural Networks",
        slug: "deep-learning-neural-networks",
        content: `
## Deep Learning with Neural Networks

Deep learning powers advanced AI applications. Explore neural networks.

### Key Topics

- Neural Network Layers
- Activation Functions
- Backpropagation

![Neural Network](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796005/neural_network.jpg)

\`\`\`python
import tensorflow as tf
model = tf.keras.Sequential([
  tf.keras.layers.Dense(64, activation='relu'),
  tf.keras.layers.Dense(10, activation='softmax')
])
\`\`\`

Dive into deep learning with neural networks.
    `.trim(),
        description: "Guide to building neural networks for deep learning.",
        excerpt: "Master deep learning fundamentals.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796005/neural_network.jpg",
        category: "Deep Learning",
        tags: ["Deep Learning", "Neural Networks", "AI"],
    },
    {
        title: "Data Science with Python",
        slug: "data-science-python",
        content: `
## Data Science with Python

Data science extracts insights from data using Python. Learn the essentials.

### Key Tools

- Pandas for Data Analysis
- Matplotlib for Visualization
- Scikit-learn for Modeling

![Data Visualization](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796006/data_viz.jpg)

\`\`\`python
import pandas as pd
df = pd.read_csv('data.csv')
print(df.describe())
\`\`\`

Unlock insights with data science.
    `.trim(),
        description: "A beginner’s guide to data science with Python.",
        excerpt: "Explore data science using Python tools.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796006/data_viz.jpg",
        category: "Data Science",
        tags: ["Data Science", "Python"],
    },
    {
        title: "Building Responsive UIs with Frontend",
        slug: "responsive-ui-frontend",
        content: `
## Building Responsive UIs with Frontend

Create user-friendly interfaces with modern frontend frameworks.

### Key Techniques

- CSS Grid and Flexbox
- Responsive Design
- Component-Based Architecture

![Responsive UI](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796007/responsive_ui.jpg)

\`\`\`css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
\`\`\`

Design responsive UIs for better user experiences.
    `.trim(),
        description: "Guide to building responsive frontend interfaces.",
        excerpt: "Learn responsive UI design.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796007/responsive_ui.jpg",
        category: "Frontend",
        tags: ["Frontend", "UI/UX"],
    },
    {
        title: "Backend Development with Node.js",
        slug: "backend-nodejs",
        content: `
## Backend Development with Node.js

Node.js powers scalable server-side applications. Learn the basics.

### Core Concepts

- Express Framework
- REST APIs
- Database Integration

![Node.js Server](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796008/nodejs_server.jpg)

\`\`\`js
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello World!'));
app.listen(3000);
\`\`\`

Build robust backends with Node.js.
    `.trim(),
        description: "Introduction to backend development with Node.js.",
        excerpt: "Create scalable backends with Node.js.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796008/nodejs_server.jpg",
        category: "Backend",
        tags: ["Backend", "Node.js"],
    },
    {
        title: "Fullstack Development Guide",
        slug: "fullstack-development",
        content: `
## Fullstack Development Guide

Combine frontend and backend skills for fullstack development.

### Key Areas

- Frontend Frameworks (React, Vue)
- Backend APIs (Node.js, Django)
- Database Management

![Fullstack Architecture](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796009/fullstack_arch.jpg)

\`\`\`js
import React from 'react';
import { render } from 'react-dom';
render(<App />, document.getElementById('root'));
\`\`\`

Become a fullstack developer with this guide.
    `.trim(),
        description: "A guide to fullstack web development.",
        excerpt: "Master both frontend and backend.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796009/fullstack_arch.jpg",
        category: "Fullstack",
        tags: ["Fullstack", "Web Development"],
    },
    {
        title: "Network Security Essentials",
        slug: "network-security-essentials",
        content: `
## Network Security Essentials

Protect communication networks from threats. Learn the essentials.

### Key Practices

- Firewalls and VPNs
- Intrusion Detection
- Encryption Protocols

![Network Security](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796010/network_security.jpg)

\`\`\`bash
# Configure a firewall rule
ufw allow 22/tcp
ufw enable
\`\`\`

Secure your networks with best practices.
    `.trim(),
        description: "Introduction to network security principles.",
        excerpt: "Learn to secure communication networks.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796010/network_security.jpg",
        category: "Network Security",
        tags: ["Network Security", "Cybersecurity"],
    },
    {
        title: "Application Security Best Practices",
        slug: "app-security-practices",
        content: `
## Application Security Best Practices

Secure software applications against vulnerabilities.

### Key Strategies

- Input Validation
- Secure Authentication
- Regular Patching

![App Security](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796011/app_security.jpg)

\`\`\`js
const sanitizeInput = (input) => input.replace(/[<>"']/g, '');
console.log(sanitizeInput(userInput));
\`\`\`

Protect your applications with these practices.
    `.trim(),
        description: "Guide to securing software applications.",
        excerpt: "Best practices for application security.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796011/app_security.jpg",
        category: "Application Security",
        tags: ["Application Security", "Cybersecurity"],
    },
    {
        title: "Ethical Hacking Techniques",
        slug: "ethical-hacking-techniques",
        content: `
## Ethical Hacking Techniques

Simulate attacks to identify vulnerabilities ethically.

### Key Methods

- Penetration Testing
- Vulnerability Scanning
- Social Engineering Defense

![Ethical Hacking](https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796012/ethical_hacking.jpg)

\`\`\`bash
# Run a vulnerability scan
nmap -sV --script vuln target.com
\`\`\`

Learn ethical hacking to secure systems.
    `.trim(),
        description: "Introduction to ethical hacking techniques.",
        excerpt: "Master ethical hacking for security.",
        image: "https://res.cloudinary.com/deq5l7fn1/image/upload/v1749796012/ethical_hacking.jpg",
        category: "Ethical Hacking",
        tags: ["Ethical Hacking", "Cybersecurity"],
    },
];

export async function seedAdditionalPosts() {
    const prisma = new PrismaClient();
    try {
        const author = await prisma.user.findUnique({
            where: { email: "author@example.com" },
        });
        if (!author) {
            throw new Error("Author not found. Please seed users first.");
        }

        for (const post of additionalPostsData) {
            console.log(
                `Processing post: ${post.title} with tags: ${post.tags.join(", ")}`,
            );
            const category = await prisma.category.findUnique({
                where: { name: post.category },
            });
            if (!category) {
                throw new Error(`Category not found: ${post.category}`);
            }

            // Check if all tags exist
            for (const tagName of post.tags) {
                const tag = await prisma.tag.findUnique({
                    where: { name: tagName },
                });
                if (!tag) {
                    console.error(
                        `Tag not found for post "${post.title}": ${tagName}`,
                    );
                } else {
                    console.log(`Tag found: ${tagName}`);
                }
            }

            const createdPost = await prisma.post.create({
                data: {
                    title: post.title,
                    slug: post.slug,
                    content: post.content,
                    description: post.description,
                    excerpt: post.excerpt,
                    image: post.image,
                    category: {
                        connect: { id: category.id },
                    },
                    isFeatured: false,
                    views: Math.floor(Math.random() * 1000),
                    readingTime: Math.floor(Math.random() * 5) + 3,
                    author: {
                        connect: { id: author.id },
                    },
                    tags: {
                        connect: post.tags.map((name) => ({ name })),
                    },
                    comments: {
                        create: getRandomComments(author.id),
                    },
                },
            });

            console.log(`✅ Created post: ${createdPost.title}`);
        }
    } catch (error) {
        console.error("Error seeding additional posts:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

function getRandomComments(authorId) {
    const commentTemplates = [
        "Amazing insights. I learned something new!",
        "Could you go deeper on this topic?",
        "Thanks for the explanation, really helpful.",
        "Nice article! Keep up the great work.",
        "Interesting take. Would love more examples.",
        "This clarified a lot of things for me.",
        "Looking forward to more posts like this.",
        "Great read. Helped me understand better.",
    ];
    const shuffled = [...commentTemplates].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 2;
    return shuffled.slice(0, count).map((content) => ({ content, authorId }));
}

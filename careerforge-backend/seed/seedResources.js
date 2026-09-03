import { LearningResource } from "../src/app/modules/learningResource/learningResource.model.js";
const resources = [
    {
        title: "freeCodeCamp - Responsive Web Design",
        platform: "freeCodeCamp",
        url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
        relatedSkills: ["HTML", "CSS", "Responsive Design", "Flexbox", "Grid"],
        cost: "Free",
    },
    {
        title: "MDN Web Docs - CSS Fundamentals",
        platform: "MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Learn/CSS",
        relatedSkills: ["CSS", "HTML", "Web Development"],
        cost: "Free",
    },
    {
        title: "The Complete JavaScript Course 2026",
        platform: "Udemy",
        url: "https://www.udemy.com/course/the-complete-javascript-course/",
        relatedSkills: ["JavaScript", "ES6", "DOM", "Async/Await"],
        cost: "Paid",
    },
    {
        title: "JavaScript30 by Wes Bos",
        platform: "YouTube",
        url: "https://javascript30.com/",
        relatedSkills: ["JavaScript", "ES6", "DOM Manipulation"],
        cost: "Free",
    },
    {
        title: "CS50's Web Programming with Python and JavaScript",
        platform: "Coursera",
        url: "https://www.coursera.org/learn/cs50s-web-programming-with-python-and-javascript",
        relatedSkills: ["JavaScript", "Python", "Django", "React", "SQL"],
        cost: "Free",
    },
    {
        title: "React - The Complete Guide (Incl. Next.js)",
        platform: "Udemy",
        url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
        relatedSkills: ["React", "React Hooks", "Redux", "Next.js", "TypeScript"],
        cost: "Paid",
    },
    {
        title: "React Official Documentation",
        platform: "React.dev",
        url: "https://react.dev/learn",
        relatedSkills: ["React", "Hooks", "Component Design"],
        cost: "Free",
    },
    {
        title: "Python for Everybody Specialization",
        platform: "Coursera",
        url: "https://www.coursera.org/specializations/python",
        relatedSkills: ["Python", "Data Structures", "Databases", "Data Analysis"],
        cost: "Paid",
    },
    {
        title: "Corey Schafer - Python Tutorials",
        platform: "YouTube",
        url: "https://www.youtube.com/playlist?list=PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7",
        relatedSkills: ["Python", "OOP", "Flask", "Django"],
        cost: "Free",
    },
    {
        title: "The Complete Node.js Developer Course",
        platform: "Udemy",
        url: "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/",
        relatedSkills: ["Node.js", "Express", "MongoDB", "REST APIs"],
        cost: "Paid",
    },
    {
        title: "Node.js and Express.js - Full Course",
        platform: "YouTube",
        url: "https://www.youtube.com/watch?v=Oe421EPiBEU",
        relatedSkills: ["Node.js", "Express", "REST APIs"],
        cost: "Free",
    },
    {
        title: "MongoDB University - M001: MongoDB Basics",
        platform: "MongoDB University",
        url: "https://learn.mongodb.com/courses/m001-mongodb-basics",
        relatedSkills: ["MongoDB", "NoSQL", "Database Design"],
        cost: "Free",
    },
    {
        title: "Figma Tutorial for Beginners",
        platform: "YouTube",
        url: "https://www.youtube.com/watch?v=jwCmIBJ8Jtc",
        relatedSkills: ["Figma", "UI Design", "Prototyping", "Wireframing"],
        cost: "Free",
    },
    {
        title: "Google UX Design Professional Certificate",
        platform: "Coursera",
        url: "https://www.coursera.org/professional-certificates/google-ux-design",
        relatedSkills: ["UI Design", "UX Research", "Prototyping", "Figma", "User Testing"],
        cost: "Paid",
    },
    {
        title: "Excel Skills for Business Specialization",
        platform: "Coursera",
        url: "https://www.coursera.org/specializations/excel",
        relatedSkills: ["Excel", "Data Analysis", "Pivot Tables", "Data Visualization"],
        cost: "Paid",
    },
    {
        title: "Alex The Analyst - Excel Tutorial",
        platform: "YouTube",
        url: "https://www.youtube.com/watch?v=irYz2HQ7oPA",
        relatedSkills: ["Excel", "Data Analysis", "Pivot Tables"],
        cost: "Free",
    },
    {
        title: "Effective Communication Skills",
        platform: "Coursera",
        url: "https://www.coursera.org/learn/effective-business-communication",
        relatedSkills: ["Communication", "Presentation", "Business Writing"],
        cost: "Free",
    },
    {
        title: "HubSpot Academy - Digital Marketing",
        platform: "HubSpot Academy",
        url: "https://academy.hubspot.com/courses/digital-marketing",
        relatedSkills: ["SEO", "Social Media Marketing", "Content Marketing", "Email Marketing"],
        cost: "Free",
    },
    {
        title: "Google Digital Garage - Fundamentals of Digital Marketing",
        platform: "Google",
        url: "https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing",
        relatedSkills: ["Digital Marketing", "SEO", "Google Ads", "Analytics"],
        cost: "Free",
    },
    {
        title: "freeCodeCamp - Machine Learning with Python",
        platform: "freeCodeCamp",
        url: "https://www.freecodecamp.org/learn/machine-learning-with-python/",
        relatedSkills: ["Python", "Machine Learning", "TensorFlow", "Neural Networks"],
        cost: "Free",
    },
];
export const seedResources = async () => {
    await LearningResource.deleteMany({});
    const result = await LearningResource.insertMany(resources);
    return result.length;
};
//# sourceMappingURL=seedResources.js.map
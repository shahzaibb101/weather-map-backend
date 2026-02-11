import express, { Request, Response } from 'express';
import  Blog  from '../../models/blogs';
import  News  from '../../models/news';

const router = express.Router();

router.get('/blogs', async (req: Request, res: Response) => {
    try {
        const blogs = await Blog.find();
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
});

router.get('/news', async (req: Request, res: Response) => {
    try {
        const news = await News.find();
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

router.get('/blogs/:id', async (req: Request, res: Response) => {
    const blogId = req.params.id;

    try {
        const blog = await Blog.findById(blogId);
        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blog' });
    }
});

router.get('/news/:id', async (req: Request, res: Response) => {
    const newsId = req.params.id;

    try {
        const news = await News.findById(newsId);
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

export default router;

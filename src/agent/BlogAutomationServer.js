#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Parser from 'rss-parser';
import OpenAI from 'openai';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

class BlogAutomationServer {
  constructor() {
    this.server = new Server(
      {
        name: "blog-automation-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.parser = new Parser();
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_blog_post",
          description: "Read RSS feeds, generate original blog content, create images, and publish to WordPress",
          inputSchema: {
            type: "object",
            properties: {
              feedUrls: {
                type: "array",
                items: { type: "string" },
                description: "Array of RSS feed URLs to analyze"
              },
              targetKeywords: {
                type: "array",
                items: { type: "string" },
                description: "Optional target keywords to focus on"
              },
              publishImmediately: {
                type: "boolean",
                description: "Whether to publish immediately or save as draft",
                default: true
              }
            },
            required: ["feedUrls"]
          },
        },
        {
          name: "analyze_feeds_only",
          description: "Analyze RSS feeds and return trending topics without generating content",
          inputSchema: {
            type: "object",
            properties: {
              feedUrls: {
                type: "array",
                items: { type: "string" },
                description: "Array of RSS feed URLs to analyze"
              }
            },
            required: ["feedUrls"]
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "generate_blog_post":
          return await this.generateBlogPost(request.params.arguments);
        case "analyze_feeds_only":
          return await this.analyzeFeedsOnly(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async fetchFeedArticles(feedUrls) {
    const allArticles = [];
    
    for (const url of feedUrls) {
      try {
        const feed = await this.parser.parseURL(url);
        const articles = feed.items.slice(0, 10).map(item => ({
          title: item.title,
          content: item.content || item.summary || item.description,
          link: item.link,
          pubDate: item.pubDate,
          source: feed.title
        }));
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Error fetching feed ${url}:`, error.message);
      }
    }

    return allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }

  async generateBlogContent(articles, targetKeywords = []) {
    const articlesText = articles.map(article => 
      `Source: ${article.source}\nTitle: ${article.title}\nContent: ${article.content?.substring(0, 500)}...`
    ).join('\n\n---\n\n');

    const prompt = `
You are an AI Blogging Assistant for ${process.env.COMPANY_NAME}, specializing in creating original SEO-optimized blog content.

Company Focus: ${process.env.COMPANY_FOCUS}
Target Keywords: ${targetKeywords.join(', ')}

Based on the following articles from various sources, create a completely original blog post:

${articlesText}

Your goals:
1. Analyze the trending topics and select the most relevant/engaging subject
2. Write a completely original blog post:
   - Length: 800–1200 words
   - Tone: Professional, engaging, and informative
   - Include compelling introduction, 3–6 descriptive subheadings, and strong conclusion
   - Add bullet points or numbered lists when helpful for readability
   - Include 1–2 internal link suggestions (format: [link:suggested-slug])
   - Naturally incorporate relevant keywords throughout
   - Add a call-to-action in the conclusion
3. Generate an SEO-optimized meta description (140-160 characters)
4. Create 5–8 SEO-friendly tags and 1–2 relevant categories
5. Generate a detailed DALL·E/Stable Diffusion image prompt
6. Create an engaging excerpt (150-200 characters) for social sharing

Return ONLY valid JSON in this exact structure:

{
  "title": "SEO-Optimized Post Title (Under 60 Characters)",
  "slug": "suggested-url-slug",
  "content": "Full HTML-formatted blog content with proper headings",
  "excerpt": "Engaging excerpt for social media sharing",
  "categories": ["Primary Category", "Secondary Category"],
  "tags": ["primary-keyword", "secondary-keyword", "topic-tag", "industry-tag"],
  "seo_description": "Compelling meta description with keywords",
  "image_prompt": "Detailed prompt for AI image generation including style, mood, colors",
  "featured_image_alt": "Alt text for the generated image",
  "status": "publish",
  "author_id": 1
}

Critical Rules:
- NEVER copy sentences directly from source articles — always rewrite and synthesize
- Use conversational, human-like language — avoid AI-sounding phrases
- Structure with <h2> and <h3> tags for WordPress compatibility
- Include relevant keywords naturally without stuffing
- Ensure content provides genuine value beyond the source material
- Always output valid JSON that can be directly posted to WordPress REST API
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  async generateFeaturedImage(imagePrompt) {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1792x1024",
        quality: "standard",
        n: 1,
      });

      const imageUrl = response.data[0].url;
      
      // Download the image
      const imageResponse = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream'
      });

      return imageResponse.data;
    } catch (error) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  async uploadToWordPress(imageStream, filename) {
    try {
      const form = new FormData();
      form.append('file', imageStream, {
        filename: filename,
        contentType: 'image/png'
      });

      const response = await axios.post(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
          }
        }
      );

      return response.data.id;
    } catch (error) {
      throw new Error(`WordPress media upload failed: ${error.message}`);
    }
  }

  async publishToWordPress(postData, featuredImageId = null) {
    try {
      const wordpressPost = {
        title: postData.title,
        slug: postData.slug,
        content: postData.content,
        excerpt: postData.excerpt,
        categories: await this.ensureCategories(postData.categories),
        tags: await this.ensureTags(postData.tags),
        meta: {
          description: postData.seo_description
        },
        status: postData.status,
        author: postData.author_id
      };

      if (featuredImageId) {
        wordpressPost.featured_media = featuredImageId;
      }

      const response = await axios.post(
        `${process.env.WORDPRESS_URL}/wp-json/wp/v2/posts`,
        wordpressPost,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`WordPress publishing failed: ${error.message}`);
    }
  }

  async ensureCategories(categoryNames) {
    // Implementation to ensure categories exist in WordPress
    // Returns array of category IDs
    return [1]; // Placeholder - implement category creation/lookup
  }

  async ensureTags(tagNames) {
    // Implementation to ensure tags exist in WordPress
    // Returns array of tag IDs
    return []; // Placeholder - implement tag creation/lookup
  }

  async generateBlogPost({ feedUrls, targetKeywords = [], publishImmediately = true }) {
    try {
      // Step 1: Fetch articles from RSS feeds
      const articles = await this.fetchFeedArticles(feedUrls);
      
      if (articles.length === 0) {
        throw new Error("No articles found in the provided feeds");
      }

      // Step 2: Generate blog content
      const blogData = await this.generateBlogContent(articles, targetKeywords);

      // Step 3: Generate featured image
      const imageStream = await this.generateFeaturedImage(blogData.image_prompt);
      const imageFilename = `${blogData.slug}-featured.png`;
      const featuredImageId = await this.uploadToWordPress(imageStream, imageFilename);

      // Step 4: Publish to WordPress
      if (publishImmediately) {
        const publishedPost = await this.publishToWordPress(blogData, featuredImageId);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Blog post successfully generated and published!",
              postUrl: publishedPost.link,
              postId: publishedPost.id,
              title: blogData.title,
              categories: blogData.categories,
              tags: blogData.tags
            }, null, 2)
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Blog post generated but not published",
              blogData: blogData,
              featuredImageId: featuredImageId
            }, null, 2)
          }]
        };
      }

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  async analyzeFeedsOnly({ feedUrls }) {
    try {
      const articles = await this.fetchFeedArticles(feedUrls);
      
      const analysis = {
        totalArticles: articles.length,
        sources: [...new Set(articles.map(a => a.source))],
        recentTopics: articles.slice(0, 10).map(a => ({
          title: a.title,
          source: a.source,
          publishDate: a.pubDate
        })),
        trendingKeywords: this.extractTrendingKeywords(articles)
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(analysis, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  extractTrendingKeywords(articles) {
    // Simple keyword extraction - could be enhanced with NLP libraries
    const allText = articles.map(a => `${a.title} ${a.content}`).join(' ').toLowerCase();
    const words = allText.match(/\b\w{4,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Blog Automation MCP server running on stdio");
  }
}

const server = new BlogAutomationServer();
server.run().catch(console.error);
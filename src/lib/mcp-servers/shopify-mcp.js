#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// IMPORTANT: For STDIO transports, ANY non-JSON output on stdout corrupts the protocol stream.
// Redirect all console.log output to stderr so stdout remains pure JSON-RPC.
// (Tool handler debug prints included.)
// If you need to disable this, remove the override — but be aware of protocol framing.
console.log = (...args) => { console.error(...args); };
class ShopifyMCPServer {
    server;
    config;
    constructor() {
        this.config = {
            shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || "",
            accessToken: process.env.SHOPIFY_ACCESS_TOKEN || "",
            apiVersion: process.env.SHOPIFY_API_VERSION || "2024-01",
        };
        // NOTE: The Server constructor takes (serverInfo, options?).
        // Capabilities must be passed as the SECOND argument, otherwise they are ignored
        // and server._capabilities remains empty, causing
        // "Server does not support tools" errors on tools/list or tools/call.
        this.server = new Server(
            {
                name: "shopify-mcp-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    // Must be objects per SDK schema, not booleans
                    tools: {},
                    resources: {},
                },
            }
        );
        this.setupToolHandlers();
        this.setupResourceHandlers();
    }
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "shopify_search_products",
                    description: "Search for products with AI-enhanced query understanding",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query" },
                            category: {
                                type: "string",
                                description: "Product category filter",
                            },
                            priceRange: { type: "string", description: "Price range filter" },
                            limit: {
                                type: "number",
                                description: "Maximum number of results",
                                default: 10,
                            },
                        },
                        required: ["query"],
                    },
                },
                {
                    name: "shopify_get_product_detail",
                    description: "Get a single product's full detail by id, handle, or title",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Global product ID gid://shopify/Product/..." },
                            handle: { type: "string", description: "Product handle (URL slug)" },
                            title: { type: "string", description: "Exact product title to match if id/handle not provided" },
                            sku: { type: "string", description: "Variant SKU (will look up owning product)" },
                        },
                        oneOf: [
                            { required: ["id"] },
                            { required: ["handle"] },
                            { required: ["title"] },
                            { required: ["sku"] }
                        ],
                    },
                },
                {
                    name: "shopify_get_order_status",
                    description: "Get order status and tracking information",
                    inputSchema: {
                        type: "object",
                        properties: {
                            orderNumber: { type: "string", description: "Order number" },
                            email: { type: "string", description: "Customer email" },
                        },
                        required: [],
                    },
                },
                {
                    name: "shopify_get_recommendations",
                    description: "Get personalized product recommendations",
                    inputSchema: {
                        type: "object",
                        properties: {
                            userId: { type: "string", description: "User ID" },
                            category: { type: "string", description: "Product category" },
                            limit: {
                                type: "number",
                                description: "Maximum number of recommendations",
                                default: 6,
                            },
                            recentPurchases: {
                                type: "array",
                                items: { type: "string" },
                                description: "Recent purchase IDs",
                            },
                        },
                        required: ["userId"],
                    },
                },
                {
                    name: "shopify_update_preferences",
                    description: "Update user preferences",
                    inputSchema: {
                        type: "object",
                        properties: {
                            userId: { type: "string", description: "User ID" },
                            preferences: {
                                type: "object",
                                description: "User preferences object",
                            },
                        },
                        required: ["userId", "preferences"],
                    },
                },
                {
                    name: "shopify_check_inventory",
                    description: "Check inventory status for products",
                    inputSchema: {
                        type: "object",
                        properties: {
                            productIds: {
                                type: "array",
                                items: { type: "number" },
                                description: "Array of product IDs",
                            },
                        },
                        required: ["productIds"],
                    },
                },
                {
                    name: "shopify_process_return",
                    description: "Process returns and exchanges",
                    inputSchema: {
                        type: "object",
                        properties: {
                            orderId: { type: "string", description: "Order ID" },
                            items: {
                                type: "array",
                                items: { type: "object" },
                                description: "Items to return",
                            },
                            reason: { type: "string", description: "Return reason" },
                            returnType: { type: "string", description: "Return or exchange" },
                        },
                        required: ["orderId", "items", "reason", "returnType"],
                    },
                },
                // {
                //   name: "shopify_get_shipping_rates",
                //   description: "Get shipping rates and options",
                //   inputSchema: {
                //     type: "object",
                //     properties: {
                //       origin: { type: "string", description: "Origin address" },
                //       destination: {
                //         type: "string",
                //         description: "Destination address",
                //       },
                //       items: {
                //         type: "array",
                //         items: { type: "object" },
                //         description: "Items to ship",
                //       },
                //       weight: { type: "number", description: "Total weight" },
                //     },
                //     required: ["origin", "destination", "items", "weight"],
                //   },
                // },
            ],
        }));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args = {} } = request.params;
                switch (name) {
                    case "shopify_search_products": {
                        const { query, category, limit = 5 } = args;
                        if (!query) {
                            return {
                                content: [{ type: "text", text: `Missing query` }]
                            };
                        }
                        console.log("Handling search products with args:", 184);
                        const products = await this.searchShopifyProducts(query, category, limit);
                        console.log("Handling search products with args:", products);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        count: products.length,
                                        products
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    case "shopify_get_product_detail": {
                        const detail = await this.getProductDetail(args);
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(detail, null, 2)
                                }
                            ]
                        };
                    }
                    case "shopify_get_order_status":
                        console.log("Handling get order status with args:", args);
                        return await this.handleGetOrderStatus(args);
                    case "shopify_get_recommendations":
                        return await this.handleGetRecommendations(args);
                    case "shopify_update_preferences":
                        return await this.handleUpdatePreferences(args);
                    case "shopify_check_inventory":
                        return await this.handleCheckInventory(args);
                    case "shopify_process_return":
                        return await this.handleProcessReturn(args);
                    // case "shopify_get_shipping_rates":
                    //   return await this.handleGetShippingRates(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: `Tool call failed: ${error.message}`,
                            }, null, 2),
                        },
                    ],
                };
            }
        });
    }
    // Handler methods for tool calls
    async handleSearchProducts(params) {
        try {
            const { query, category, priceRange, limit = 10 } = params;
            // Enhanced search with AI understanding
            const enhancedQuery = await this.enhanceSearchQuery(query, category, priceRange);
            const products = await this.searchShopifyProducts(enhancedQuery, limit);
            // Temporary mock response for demonstration
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            products: products.map((product) => ({
                                id: product.id,
                                title: product.title,
                                price: parseFloat(product.variants[0]?.price || 0),
                                category: product.product_type,
                                rating: this.calculateProductRating(product),
                                reviewCount: product.review_count || 0,
                                inStock: product.variants[0]?.inventory_quantity > 0,
                                image: product.images[0]?.src,
                                description: product.body_html,
                                tags: product.tags.split(",").map((tag) => tag.trim()),
                                variants: product.variants.map((variant) => ({
                                    id: variant.id,
                                    title: variant.title,
                                    price: parseFloat(variant.price),
                                    sku: variant.sku,
                                    inStock: variant.inventory_quantity > 0,
                                })),
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Product search failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleGetOrderStatus(params) {
        try {
            const { orderNumber, email } = params;
            if (!orderNumber && !email) {
                throw new Error("Order number or email is required");
            }
            const order = (await this.getShopifyOrder(orderNumber, email)) || {
                order_number: "12345",
                fulfillment_status: "unfulfilled",
                created_at: new Date().toISOString(),
                line_items: [],
                total_price: "0.00",
                shipping_address: {},
                billing_address: {},
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            orderNumber: order.order_number,
                            status: order.fulfillment_status || "unfulfilled",
                            orderDate: order.created_at,
                            estimatedDelivery: this.calculateEstimatedDelivery(order),
                            currentLocation: this.getCurrentLocation(order),
                            items: (order.line_items ?? []).map((item) => ({
                                title: item.title,
                                quantity: item.quantity,
                                price: parseFloat(item.price),
                                status: item.fulfillment_status,
                            })),
                            total: parseFloat(order.total_price ?? "0"),
                            shippingAddress: order.shipping_address,
                            billingAddress: order.billing_address,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Order status check failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleGetRecommendations(params) {
        try {
            const { userId, category, limit = 6, recentPurchases = [] } = params;
            // AI-powered recommendation algorithm
            const recommendations = await this.generateRecommendations(userId, category, recentPurchases, limit);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            products: recommendations.map((product) => ({
                                id: product.id,
                                title: product.title,
                                price: product.price,
                                category: product.category,
                                rating: product.rating,
                                reason: product.recommendationReason,
                                matchScore: product.matchScore,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Recommendations failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleUpdatePreferences(params) {
        try {
            const { userId, preferences } = params;
            // Store user preferences (could be in database or cache)
            await this.storeUserPreferences(userId, preferences);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            message: "Preferences updated successfully",
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Preference update failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleCheckInventory(params) {
        try {
            const { productIds } = params;
            const inventory = await this.getShopifyInventory(productIds);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            inventory: inventory.map((item) => ({
                                productId: item.product_id,
                                variantId: item.variant_id,
                                available: item.inventory_quantity,
                                reserved: undefined,
                                lowStock: item.inventory_quantity < 10,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Inventory check failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleProcessReturn(params) {
        try {
            const { orderId, items, reason, returnType } = params;
            const returnRequest = await this.createReturnRequest(orderId, items, reason, returnType);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            returnId: returnRequest.id,
                            status: "pending",
                            estimatedRefund: returnRequest.estimatedRefund,
                            returnLabel: returnRequest.returnLabel,
                            instructions: returnRequest.instructions,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Return processing failed: ${error.message}`,
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async enhanceSearchQuery(query, category, priceRange) {
        // Fallback to basic query enhancement
        let enhancedQuery = query;
        if (category) {
            enhancedQuery += ` category:${category}`;
        }
        if (priceRange) {
            enhancedQuery += ` price:${priceRange}`;
        }
        // Add synonyms and related terms
        const synonyms = await this.getProductSynonyms(query);
        if (synonyms.length > 0) {
            enhancedQuery += ` OR ${synonyms.join(" OR ")}`;
        }
        return enhancedQuery;
    }
    async shopifyGraphQL(query, variables) {
        this.validateConfig();
        const url = `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}/graphql.json`;
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": this.config.accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });
        const json = await resp.json();
        if (!resp.ok || json.errors) {
            throw new McpError(ErrorCode.InvalidRequest, `Shopify GraphQL Error: ${JSON.stringify(json.errors || json)}`);
        }
        return json.data;
    }
    async searchShopifyProducts(query, category, limit = 10) {
        const gql = `
      query ProductsSearch($q: String!, $first: Int!) {
        products(first: $first, query: $q) {
          edges {
            node {
              id
              title
              productType
              tags
              descriptionHtml
              images(first: 10) { edges { node { url } } }
              variants(first: 25) {
                edges {
                  node {
                    id
                    sku
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;
        // Shopify product search syntax; include category terms if provided
        let searchQuery = query;
        if (category) {
            // attempt matching product_type OR tag
            searchQuery += ` AND (product_type:${category} OR tag:${category})`;
        }
        const data = await this.shopifyGraphQL(gql, { q: searchQuery, first: limit });
        const edges = data?.products?.edges ?? [];
        const products = edges.map((e) => e.node);
        return products.map((p) => this.formatGraphQLProduct(p));
    }
    async getProductDetail(params) {
        console.log("Normalized product:");
        const { id, handle, title, sku } = params;
        console.log("Normalized product:", { id, handle, title, sku });
        // GraphQL fragments for reuse
        const productFragment = `
      fragment ProductFields on Product {
        id
        title
        handle
  vendor
  createdAt
  updatedAt
  publishedAt
        descriptionHtml
        productType
        tags
  hasOnlyDefaultVariant
  totalInventory
  options { id name values }
  seo { title description }
  collections(first: 10) { edges { node { id handle title } } }
  metafields(first: 15) { edges { node { namespace key type value } } }
        images(first: 20) { edges { node { url altText } } }
        variants(first: 50) {
          edges { node { id sku title price inventoryQuantity availableForSale } }
        }
      }
    `;
        let data;
                if (id) {
            const q = `
        ${productFragment}
        query GetProduct($id: ID!) {
          node(id: $id) { ... on Product { ...ProductFields } }
        }
      `;
            data = await this.shopifyGraphQL(q, { id });
            const node = data?.node;
            if (!node)
                throw new McpError(ErrorCode.InternalError, "Product not found by id");
            return this.normalizeFullProduct(node);
        }
        else if (handle) {
            const q = `
        ${productFragment}
        query GetProductByHandle($handle: String!) {
          productByHandle(handle: $handle) { ...ProductFields }
        }
      `;
            data = await this.shopifyGraphQL(q, { handle });
            const prod = data?.productByHandle;
            if (!prod)
                throw new McpError(ErrorCode.InternalError, "Product not found by handle");
            return this.normalizeFullProduct(prod);
        }
                else if (sku) {
                        // Search variant by SKU then fetch product
                        // Shopify: variants can be searched via products query with sku filter
                        const q = `
                ${productFragment}
                query ProductBySKU($q: String!) {
                    products(first: 5, query: $q) { edges { node { ...ProductFields variants(first: 50) { edges { node { id sku } } } } } }
                }
            `;
                        // Use sku: filter (Shopify supports sku: prefix). Surround with quotes to match exactly
                        const skuQuery = `sku:'${sku.replace(/'/g, "\\'")}'`;
                        data = await this.shopifyGraphQL(q, { q: skuQuery });
                        const edges = data?.products?.edges ?? [];
                        if (!edges.length)
                                throw new McpError(ErrorCode.InternalError, "Product not found by SKU");
                        // If multiple products (should be rare) pick the one containing exact SKU match
                        const matchEdge = edges.find(e => (e.node.variants?.edges ?? []).some(v => v.node.sku === sku)) || edges[0];
                        const normalized = this.normalizeFullProduct(matchEdge.node);
                        normalized.matchedSku = sku;
                        return normalized;
                }
        else if (title) {
            // Use product search
            const q = `
        ${productFragment}
        query SearchProduct($q: String!) {
          products(first: 1, query: $q) { edges { node { ...ProductFields } } }
        }
      `;
            // Surround title with quotes to force exact match; Shopify may still fuzzy match.
            const searchQuery = `title:'${title.replace(/'/g, "\\'")}'`;
            data = await this.shopifyGraphQL(q, { q: searchQuery });
            const prod = data?.products?.edges?.[0]?.node;
            if (prod) {
                return this.normalizeFullProduct(prod);
            }
            // Fallback fuzzy search: break title into tokens and search without quotes
            const tokens = title.split(/\s+/).filter(t => t.length > 2);
            if (!tokens.length)
                throw new McpError(ErrorCode.InternalError, "Product not found by title");
            const broadQuery = tokens.join(" ");
            const broadQ = `
        ${productFragment}
        query BroadSearch($q: String!) {
          products(first: 10, query: $q) { edges { node { ...ProductFields } } }
        }
      `;
            const broadData = await this.shopifyGraphQL(broadQ, { q: broadQuery });
            const candidates = (broadData?.products?.edges ?? []).map((e) => e.node);
            if (!candidates.length) {
                throw new McpError(ErrorCode.InternalError, "Product not found by title (broad search empty)");
            }
            // Rank by normalized Levenshtein distance of titles (case-insensitive)
            const ranked = candidates.map((c) => {
                const dist = this.levenshtein(c.title.toLowerCase(), title.toLowerCase());
                const maxLen = Math.max(c.title.length, title.length) || 1;
                const score = 1 - dist / maxLen; // 1 = exact match
                return { c, score };
            }).sort((a, b) => b.score - a.score);
            const best = ranked[0];
            if (!best || best.score < 0.5) { // arbitrary threshold
                throw new McpError(ErrorCode.InternalError, `Product not found by title (best similarity ${(best?.score ?? 0).toFixed(2)})`);
            }
            const normalized = this.normalizeFullProduct(best.c);
            normalized.matchedTitleConfidence = best.score;
            console.log("Normalized product:", normalized);
            return normalized;
        }
        else {
                        throw new McpError(ErrorCode.InvalidParams, "Provide id, handle, title, or sku");
        }
    }
    normalizeFullProduct(p) {
        const variants = (p.variants?.edges ?? []).map((e) => e.node);
        const images = (p.images?.edges ?? []).map((e) => e.node);
        const collections = (p.collections?.edges ?? []).map((e) => e.node);
        const metafields = (p.metafields?.edges ?? []).map((e) => e.node);
        return {
            id: p.id,
            title: p.title,
            handle: p.handle,
            vendor: p.vendor,
            description: this.stripHtml(p.descriptionHtml),
            descriptionHtml: p.descriptionHtml,
            productType: p.productType,
            tags: p.tags,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            publishedAt: p.publishedAt,
            hasOnlyDefaultVariant: p.hasOnlyDefaultVariant,
            totalInventory: p.totalInventory ?? variants.reduce((s, v) => s + (v.inventoryQuantity ?? 0), 0),
            options: (p.options || []).map((o) => ({ name: o.name, values: o.values })),
            seo: p.seo,
            collections,
            metafields: metafields.map((m) => ({
                namespace: m.namespace,
                key: m.key,
                type: m.type,
                value: m.value,
            })),
            images: images.map((i) => ({ url: i.url, altText: i.altText })),
            mainImage: images[0]?.url,
            variants: variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                title: v.title,
                price: v.price,
                inventoryQuantity: v.inventoryQuantity,
                availableForSale: v.availableForSale,
            })),
            primaryPrice: variants[0]?.price,
            inStock: variants.some((v) => (v.inventoryQuantity ?? 0) > 0),
            fetchedAt: new Date().toISOString(),
            source: "shopify_graphql",
        };
    }
    // Basic Levenshtein distance for fuzzy matching
    levenshtein(a, b) {
        const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++)
            dp[i][0] = i;
        for (let j = 0; j <= b.length; j++)
            dp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + cost // substitution
                );
            }
        }
        return dp[a.length][b.length];
    }
    formatGraphQLProduct(p) {
        const variants = (p.variants?.edges ?? []).map((e) => e.node);
        return {
            id: p.id,
            title: p.title,
            description: this.stripHtml(p.descriptionHtml)?.slice(0, 400),
            productType: p.productType,
            tags: (p.tags || []).map((t) => t),
            price: variants[0]?.price,
            currency: "USD",
            sku: variants[0]?.sku,
            inStock: variants.some((v) => (v.inventoryQuantity ?? 0) > 0),
            totalInventory: variants.reduce((sum, v) => sum + (v.inventoryQuantity ?? 0), 0),
            images: (p.images?.edges ?? []).map((e) => e.node.url),
            mainImage: (p.images?.edges ?? [])[0]?.node?.url,
            variants: variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                price: v.price,
                inventoryQuantity: v.inventoryQuantity,
            })),
        };
    }
    stripHtml(descriptionHtml) {
        // Simple HTML tag stripper
        if (typeof descriptionHtml !== "string")
            return "";
        return descriptionHtml.replace(/<[^>]*>/g, "");
    }
    async getShopifyOrder(orderNumber, email) {
        // Build order search query
        // name:"12345" AND email:"user@example.com"
        const parts = [];
        if (orderNumber)
            parts.push(`name:${orderNumber}`);
        if (email)
            parts.push(`email:${email}`);
        if (!parts.length) {
            throw new McpError(ErrorCode.InvalidParams, "Order number or email required");
        }
        const gql = `
      query OrderLookup($q: String!) {
        orders(first: 1, query: $q, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              displayFulfillmentStatus
              processedAt
              currentSubtotalPriceSet { shopMoney { amount currencyCode } }
              shippingAddress {
                address1 city province country zip
              }
              billingAddress {
                address1 city province country zip
              }
              lineItems(first: 50) {
                edges {
                  node {
                    name
                    quantity
                    originalUnitPriceSet { shopMoney { amount currencyCode } }
                    fulfillmentStatus
                  }
                }
              }
            }
          }
        }
      }
    `;
        const q = parts.join(" AND ");
        const data = await this.shopifyGraphQL(gql, { q });
        const orderEdge = data?.orders?.edges?.[0];
        if (!orderEdge) {
            throw new McpError(ErrorCode.InternalError, "Order not found");
        }
        const o = orderEdge.node;
        // Normalize to prior shape used by handleGetOrderStatus
        return {
            order_number: o.name,
            fulfillment_status: o.displayFulfillmentStatus?.toLowerCase(),
            created_at: o.processedAt,
            line_items: (o.lineItems?.edges ?? []).map((e) => ({
                title: e.node.name,
                quantity: e.node.quantity,
                price: e.node.originalUnitPriceSet?.shopMoney?.amount ?? "0",
                fulfillment_status: e.node.fulfillmentStatus,
            })),
            total_price: o.currentSubtotalPriceSet?.shopMoney?.amount,
            shipping_address: o.shippingAddress,
            billing_address: o.billingAddress,
        };
    }
    calculateEstimatedDelivery(order) {
        const orderDate = new Date(order.created_at);
        const estimatedDate = new Date(orderDate);
        estimatedDate.setDate(estimatedDate.getDate() + 5); // 5 business days
        return estimatedDate.toISOString();
    }
    getCurrentLocation(order) {
        if (order.fulfillment_status === "fulfilled") {
            return "Delivered to customer";
        }
        else if (order.fulfillment_status === "partial") {
            return "Partially shipped";
        }
        else {
            return "Processing at warehouse";
        }
    }
    calculateProductRating(product) {
        // Mock rating calculation - replace with real review data
        return 4.5 + Math.random() * 0.5;
    }
    async generateRecommendations(userId, category, recentPurchases, limit) {
        // AI-powered recommendation algorithm
        const recommendations = [
            {
                id: 1,
                title: "Wireless Bluetooth Headphones",
                price: 79.99,
                category: "Electronics",
                rating: 4.5,
                recommendationReason: "Based on your interest in audio equipment",
                matchScore: 0.95,
            },
            {
                id: 2,
                title: "Smart Watch Series 5",
                price: 299.99,
                category: "Electronics",
                rating: 4.8,
                recommendationReason: "Popular in your preferred category",
                matchScore: 0.87,
            },
        ];
        return recommendations.slice(0, limit);
    }
    async storeUserPreferences(userId, preferences) {
        // Mock storage - replace with real database implementation
        console.log(`Storing preferences for user ${userId}:`, preferences);
        return true;
    }
    async getProductSynonyms(query) {
        // Fallback to basic synonym mapping
        const synonymMap = {
            headphones: ["earphones", "earbuds", "audio", "sound"],
            laptop: ["computer", "notebook", "pc", "macbook"],
            phone: ["smartphone", "mobile", "cellphone", "iphone"],
        };
        return synonymMap[query.toLowerCase()] || [];
    }
    async getShopifyInventory(productIds) {
        const inventoryItems = await Promise.all(productIds.map(async (id) => {
            const endpoint = `products/${id}/variants.json?fields=inventory_quantity,inventory_item_id`;
            const response = await this.makeShopifyRequest(endpoint);
            return response.variants;
        }));
        return inventoryItems.flat().map((item) => ({
            product_id: item.product_id,
            variant_id: item.id,
            inventory_quantity: item.inventory_quantity,
            inventory_item_id: item.inventory_item_id,
        }));
    }
    async createReturnRequest(orderId, items, reason, returnType) {
        // Mock return processing - replace with real implementation
        return {
            id: `RET-${Date.now()}`,
            estimatedRefund: 79.99,
            returnLabel: "https://example.com/return-label.pdf",
            instructions: "Please package items securely and affix the return label",
        };
    }
    isAddressInZone(destination, zone) {
        throw new Error("Method not implemented.");
    }
    setupResourceHandlers() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: [
                    {
                        uri: "test://info",
                        mimeType: "text/plain",
                        name: "Server Info",
                        description: "Information about this test server",
                    },
                    {
                        uri: "test://sample-data",
                        mimeType: "application/json",
                        name: "Sample Data",
                        description: "Sample JSON data for testing",
                    },
                ],
            };
        });
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            switch (uri) {
                case "test://info":
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: "text/plain",
                                text: `Simple MCP Test Server
Version: 0.1.0
Capabilities: Tools and Resources
Available Tools: echo, calculate, timestamp, random
Available Resources: info, sample-data`,
                            },
                        ],
                    };
                case "test://sample-data":
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: "application/json",
                                text: JSON.stringify({
                                    users: [
                                        { id: 1, name: "Alice", role: "admin" },
                                        { id: 2, name: "Bob", role: "user" },
                                        { id: 3, name: "Charlie", role: "user" },
                                    ],
                                    settings: {
                                        theme: "dark",
                                        language: "en",
                                        notifications: true,
                                    },
                                    metadata: {
                                        version: "1.0",
                                        lastUpdated: new Date().toISOString(),
                                    },
                                }, null, 2),
                            },
                        ],
                    };
                default:
                    throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
            }
        });
    }
    validateConfig() {
        if (!this.config.shopDomain || !this.config.accessToken) {
            throw new McpError(ErrorCode.InvalidRequest, "Missing Shopify configuration. Please set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN environment variables.");
        }
    }
    async makeShopifyRequest(endpoint, method = "GET", body) {
        this.validateConfig();
        try {
            const url = `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}/${endpoint}`;
            const response = await fetch(url, {
                method,
                headers: {
                    "X-Shopify-Access-Token": this.config.accessToken,
                    "Content-Type": "application/json",
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new McpError(ErrorCode.InvalidRequest, `Shopify API Error: ${errorData?.errors || response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw new McpError(ErrorCode.InternalError, `Shopify API request failed: ${error}.message`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log("Shopify MCP Server started");
    }
}
const server = new ShopifyMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=shopify-mcp.js.map
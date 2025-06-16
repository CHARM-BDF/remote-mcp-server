import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface PubMedResponse {
	title?: string;
	abstract?: string;
	error?: string;
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "PubMed Abstract Fetcher",
		version: "1.0.0",
	});

	async init() {
		// PubMed abstract fetcher tool
		this.server.tool(
			"get_pubmed_abstract",
			{ pubmed_id: z.string() },
			async ({ pubmed_id }) => {
				try {
					const response = await fetch("https://medikanren-gpt-edu.livecode.ch/pubmed", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ pubmed_id }),
					});

					const data = (await response.json()) as PubMedResponse;

					if (data.error) {
						return {
							content: [{ type: "text", text: `Error: ${data.error}` }],
						};
					}

					return {
						content: [
							{
								type: "text",
								text: `Title: ${data.title}\n\nAbstract: ${data.abstract}`,
							},
						],
					};
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
					return {
						content: [
							{
								type: "text",
								text: `Error fetching PubMed abstract: ${errorMessage}`,
							},
						],
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};

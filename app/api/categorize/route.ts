import { NextRequest, NextResponse } from 'next/server';
import { categorizeProductImage } from '@/lib/gemini';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data/config-live.json');

// POST /api/categorize - Categorize a product using LLM and update config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, imageUrl } = body;

    if (!productId || !productName || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, productName, imageUrl' },
        { status: 400 }
      );
    }

    console.log(`\n🏷️ [Categorize API] Received request for product: ${productId}`);

    // Use Gemini to categorize the product
    const categorization = await categorizeProductImage(imageUrl, productName);

    // Update the config file with the new category
    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);

    // Find and update the product
    const productIndex = config.products.items.findIndex(
      (p: { id: string }) => p.id === productId
    );

    if (productIndex === -1) {
      return NextResponse.json(
        { error: `Product ${productId} not found in config` },
        { status: 404 }
      );
    }

    const oldCategory = config.products.items[productIndex].category || 'none';
    config.products.items[productIndex].category = categorization.category;

    // Write updated config back to file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`   ✅ Updated ${productId} category: ${oldCategory} → ${categorization.category}`);

    return NextResponse.json({
      success: true,
      productId,
      oldCategory,
      newCategory: categorization.category,
      confidence: categorization.confidence,
      reasoning: categorization.reasoning,
    });
  } catch (error) {
    console.error('Error in categorize API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/categorize - Get current category for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId query parameter' },
        { status: 400 }
      );
    }

    const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);

    const product = config.products.items.find(
      (p: { id: string }) => p.id === productId
    );

    if (!product) {
      return NextResponse.json(
        { error: `Product ${productId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      productId,
      category: product.category || 'none',
      productName: product.name,
    });
  } catch (error) {
    console.error('Error in categorize API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

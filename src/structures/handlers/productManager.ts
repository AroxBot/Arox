import ProductModel, { IProduct, ProductType } from "@/models/Product";
import { Client } from "@/structures/core/Bot";
import { PRODUCT_TYPES } from "@/config/Products";

/**
 * ProductManager
 *
 * Utilities to fetch, paginate, edit and delete products.
 * Sorting is always ascending by product id for deterministic pagination.
 */
export class ProductManager {
  constructor(private bot: Client) {}

  private resolveEmoji(p: Pick<IProduct, "emoji" | "type">): string {
    const val = typeof p.emoji === "string" ? p.emoji.trim() : "";
    if (val) return val;
    const meta = PRODUCT_TYPES[p.type as keyof typeof PRODUCT_TYPES];
    if (meta?.emoji) return meta.emoji;
    return "🛒";
  }

  /**
   * Get a single product by its public id.
   */
  async getProduct(id: number): Promise<IProduct | null> {
    if (typeof id !== "number" || Number.isNaN(id)) throw new Error("Invalid product id");
    const doc = await ProductModel.findOne({ id }).lean<IProduct>().exec();
    if (!doc) return null;
    return { ...doc, emoji: this.resolveEmoji(doc) } as IProduct;
  }

  /**
   * Edit a product by id (partial update). Returns the updated product or null.
   * Editable fields: cost, nameId, emoji, type
   */
  async editProduct(id: number, patch: Partial<Pick<IProduct, "cost" | "nameId" | "emoji">> & { type?: ProductType }): Promise<IProduct | null> {
    if (typeof id !== "number" || Number.isNaN(id)) throw new Error("Invalid product id");
    if (!patch || Object.keys(patch).length === 0) return this.getProduct(id);

    if (patch.cost !== undefined && (typeof patch.cost !== "number" || patch.cost < 0)) {
      throw new Error("Invalid cost");
    }
    if (patch.nameId !== undefined && typeof patch.nameId !== "string") {
      throw new Error("Invalid nameId");
    }
    if (patch.emoji !== undefined && typeof patch.emoji !== "string") {
      throw new Error("Invalid emoji");
    }
    if (patch.type !== undefined && patch.type !== "wallpaper") {
      throw new Error("Invalid type");
    }

    const updated = await ProductModel.findOneAndUpdate({ id }, { $set: { ...patch } }, { new: true })
      .lean<IProduct>()
      .exec();
    return updated ? ({ ...updated, emoji: this.resolveEmoji(updated) } as IProduct) : null;
  }

  /**
   * Delete a product by id. Returns true if deleted, false otherwise.
   */
  async deleteProduct(id: number): Promise<boolean> {
    if (typeof id !== "number" || Number.isNaN(id)) throw new Error("Invalid product id");
    const res = await ProductModel.deleteOne({ id }).exec();
    return (res?.deletedCount ?? 0) > 0;
  }

  /**
   * Get a 1-based range of products by type (inclusive).
   * Example: getProducts(6, 10, "wallpaper") returns the 6th..10th items of that type ordered by id ascending.
   *
   * - start: 1-based start index (inclusive)
   * - end:   1-based end index (inclusive)
   * - type:  optional ProductType filter; when omitted returns across all types
   */
  async getProducts(start: number, end: number, type?: ProductType): Promise<IProduct[]> {
    if (typeof start !== "number" || typeof end !== "number") throw new Error("start/end must be numbers");
    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
      throw new Error("start/end must be positive integers (1-based)");
    }

    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const count = to - from + 1;

    const query: any = {};
    if (type) query.type = type;

    const docs = await ProductModel.find(query)
      .sort({ id: 1 })
      .skip(from - 1)
      .limit(count)
      .lean<IProduct[]>()
      .exec();

    return (docs ?? []).map((d) => ({ ...d, emoji: this.resolveEmoji(d) }) as IProduct);
  }
}

export default ProductManager;

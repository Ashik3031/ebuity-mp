"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  adminProductApi,
  adminCategoryApi,
  ApiError,
} from "../../lib/api-client";
import {
  Product,
  FlatCategoryItem,
  CreateProductPayload,
  UpdateProductPayload,
} from "../../types/product";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShoppingBag,
  Info,
  Tag,
  DollarSign,
  Package,
  Layers,
} from "lucide-react";

interface ProductFormProps {
  initialProduct?: Product;
  isEdit?: boolean;
}

export function ProductForm({ initialProduct, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const fileInputId = useId();

  // Form State
  const [name, setName] = useState(initialProduct?.name || "");
  const [sku, setSku] = useState(initialProduct?.sku || "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brandName, setBrandName] = useState(initialProduct?.brandName || "Rose Essence");
  const [size, setSize] = useState(initialProduct?.size || "");
  const [price, setPrice] = useState<string>(
    initialProduct?.defaultPrice !== undefined
      ? String(initialProduct.defaultPrice)
      : initialProduct?.price !== undefined
      ? String(initialProduct.price)
      : ""
  );
  const [compareAtPrice, setCompareAtPrice] = useState<string>(
    initialProduct?.compareAtPrice !== undefined ? String(initialProduct.compareAtPrice) : ""
  );
  const [stock, setStock] = useState<string>(
    initialProduct?.defaultStock !== undefined
      ? String(initialProduct.defaultStock)
      : initialProduct?.stock !== undefined
      ? String(initialProduct.stock)
      : "10"
  );
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [detailedDescription, setDetailedDescription] = useState(
    initialProduct?.detailedDescription || ""
  );
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialProduct?.tags || []);
  const [isActive, setIsActive] = useState<boolean>(
    initialProduct?.isActive !== undefined ? initialProduct.isActive : true
  );

  // Categories
  const [categories, setCategories] = useState<FlatCategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load Categories
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const res = await adminCategoryApi.getFlat();
        if (isMounted && res && Array.isArray(res.items)) {
          setCategories(res.items);

          // If editing, resolve initial category
          if (initialProduct?.category) {
            const catVal =
              typeof initialProduct.category === "object"
                ? initialProduct.category._id
                : String(initialProduct.category);
            setCategoryId(catVal);
          } else if (res.items.length > 0 && !isEdit) {
            setCategoryId(res.items[0]._id);
          }
        }
      } catch (err) {
        console.warn("Could not load categories flat:", err);
      } finally {
        if (isMounted) setLoadingCategories(false);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, [initialProduct, isEdit]);

  // Auto-generate SKU
  const handleAutoGenerateSku = () => {
    if (!name.trim()) return;
    const prefix = "RE";
    const cleaned = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.substring(0, 3).toUpperCase())
      .join("-");
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${cleaned || "PROD"}-${rand}`);
    if (fieldErrors.sku) {
      setFieldErrors((prev) => ({ ...prev, sku: "" }));
    }
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^,+|,+$/g, "");
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Add Image via URL
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (images.includes(trimmed)) {
      setErrorMessage("Image URL already added");
      return;
    }
    setImages([...images, trimmed]);
    setImageUrlInput("");
    setErrorMessage(null);
  };

  // Upload Images
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      setErrorMessage(null);
      const res = await adminProductApi.uploadImages(Array.from(files));
      if (res && res.urls && res.urls.length > 0) {
        setImages((prev) => [...prev, ...res.urls]);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Image upload failed";
      setErrorMessage(msg);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const remaining = images.filter((_, idx) => idx !== index);
    setImages([selected, ...remaining]);
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Product name is required.";
    if (!categoryId) errors.category = "Please select a product category.";
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.price = "Valid price in AED is required (e.g. 120.00).";
    }

    if (compareAtPrice.trim() !== "") {
      const parsedCompare = parseFloat(compareAtPrice);
      if (isNaN(parsedCompare) || parsedCompare < 0) {
        errors.compareAtPrice = "Compare-at price must be a valid number.";
      }
    }

    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.stock = "Stock quantity must be a non-negative integer.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setErrorMessage("Please resolve the highlighted validation errors.");
      return;
    }

    try {
      setSubmitting(true);
      const numPrice = parseFloat(price);
      const numCompare = compareAtPrice.trim() !== "" ? parseFloat(compareAtPrice) : undefined;
      const numStock = parseInt(stock, 10) || 0;

      if (isEdit && initialProduct) {
        const updatePayload: UpdateProductPayload = {
          name: name.trim(),
          brandName: brandName.trim() || "Rose Essence",
          category: categoryId,
          defaultPrice: numPrice,
          compareAtPrice: numCompare,
          defaultStock: numStock,
          description: description.trim(),
          detailedDescription: detailedDescription.trim(),
          images,
          tags,
          isActive,
        };

        await adminProductApi.update(initialProduct._id, updatePayload);
        setSuccessMessage("Product details successfully updated.");
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 1200);
      } else {
        const createPayload: CreateProductPayload = {
          name: name.trim(),
          sku: sku.trim() || undefined,
          brandName: brandName.trim() || "Rose Essence",
          categoryId: categoryId,
          category: categoryId,
          defaultPrice: numPrice,
          compareAtPrice: numCompare,
          defaultStock: numStock,
          size: size.trim() || undefined,
          description: description.trim(),
          detailedDescription: detailedDescription.trim(),
          defaultImages: images,
          images,
          tags,
          isActive,
        };

        await adminProductApi.create(createPayload);
        setSuccessMessage("New luxury product created successfully.");
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to save product. Please try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="w-10 h-10 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm flex items-center justify-center text-[#746D69] hover:text-[#292525] hover:border-[#CF565D]/40 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-[#746D69]">
              <Link href="/admin/products" className="hover:text-[#CF565D] transition-colors">
                Boutique Products
              </Link>
              <span>/</span>
              <span className="text-[#292525] font-medium">
                {isEdit ? "Edit Product" : "New Product"}
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#292525] mt-0.5">
              {isEdit ? `Edit: ${initialProduct?.name}` : "Create Boutique Product"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-4 py-2.5 rounded-xl border border-[#E8D8C8] text-sm font-medium text-[#746D69] hover:bg-stone-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploadingImage}
            className="px-6 py-2.5 rounded-xl bg-[#CF565D] text-white text-sm font-semibold shadow-md shadow-[#CF565D]/20 hover:bg-[#b8454c] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Publish Product"}
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to save product</p>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2-column info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Core Identification */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D8C8]/60 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-[#292525]">General Information</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                Product Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Damascus Rose Rejuvenating Facial Elixir"
                className={`w-full px-4 py-3 rounded-2xl border ${
                  fieldErrors.name
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-[#E8D8C8] focus:border-[#CF565D] focus:ring-[#CF565D]/10"
                } bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:ring-4 transition-all`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-rose-600 mt-1.5">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider">
                    SKU Code
                  </label>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="text-[11px] font-semibold text-[#CF565D] hover:underline"
                    >
                      Auto-generate
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. RE-SKIN-001"
                  disabled={isEdit}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm font-mono text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all disabled:opacity-60"
                />
                {isEdit && (
                  <p className="text-[11px] text-[#746D69] mt-1">SKU is locked on existing products.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Brand / Maison
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Rose Essence"
                  className="w-full px-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: "" }));
                    }}
                    disabled={loadingCategories}
                    className={`w-full px-4 py-3 rounded-2xl border ${
                      fieldErrors.category ? "border-rose-400" : "border-[#E8D8C8]"
                    } bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>
                      {loadingCategories ? "Loading categories..." : "Select product category"}
                    </option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.pathLabel || c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.category && (
                  <p className="text-xs text-rose-600 mt-1.5">{fieldErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Size / Volume
                </label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 50 ml, 250 g, 1 piece"
                  className="w-full px-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card: Pricing & Stock */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D8C8]/60 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-[#292525]">Pricing & Stock</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Price (AED) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746D69]">
                    AED
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: "" }));
                    }}
                    placeholder="120.00"
                    className={`w-full pl-14 pr-4 py-3 rounded-2xl border ${
                      fieldErrors.price ? "border-rose-400" : "border-[#E8D8C8]"
                    } bg-[#FAF7F2]/40 text-sm font-semibold text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all`}
                  />
                </div>
                {fieldErrors.price && (
                  <p className="text-xs text-rose-600 mt-1.5">{fieldErrors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Compare At (AED)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746D69]">
                    AED
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    placeholder="150.00"
                    className="w-full pl-14 pr-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#746D69] mt-1">Strikethrough original price.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                  Stock Units <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value);
                    if (fieldErrors.stock) setFieldErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  placeholder="25"
                  className={`w-full px-4 py-3 rounded-2xl border ${
                    fieldErrors.stock ? "border-rose-400" : "border-[#E8D8C8]"
                  } bg-[#FAF7F2]/40 text-sm font-semibold text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all`}
                />
                {fieldErrors.stock && (
                  <p className="text-xs text-rose-600 mt-1.5">{fieldErrors.stock}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Product Imagery */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D8C8]/60 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                  <Upload className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold text-[#292525]">Gallery & Visuals</h2>
              </div>
              <span className="text-xs font-medium text-[#746D69]">
                {images.length} / 14 Images
              </span>
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File upload drop area */}
              <label
                htmlFor={fileInputId}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E8D8C8] hover:border-[#CF565D]/60 rounded-2xl bg-[#FAF7F2]/50 hover:bg-[#F5DAD6]/20 transition-all cursor-pointer text-center ${
                  uploadingImage ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <input
                  id={fileInputId}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CF565D]" />
                    <span className="text-xs font-semibold text-[#292525]">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-[#E8D8C8] flex items-center justify-center text-[#CF565D] mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#292525]">
                      Upload Image Files
                    </span>
                    <span className="text-[11px] text-[#746D69] mt-0.5">
                      PNG, JPG, WEBP up to 5MB each
                    </span>
                  </>
                )}
              </label>

              {/* Direct URL input */}
              <div className="flex flex-col justify-between p-4 rounded-2xl bg-[#FAF7F2]/40 border border-[#E8D8C8]/60">
                <div>
                  <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-1.5">
                    Or Paste Image URL
                  </label>
                  <p className="text-[11px] text-[#746D69] mb-3">
                    Add external CDN or luxury photo showcase asset directly.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E8D8C8] bg-white text-xs text-[#292525] focus:outline-none focus:border-[#CF565D]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 rounded-xl bg-white border border-[#E8D8C8] text-xs font-semibold text-[#292525] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square rounded-2xl overflow-hidden border border-[#E8D8C8] bg-[#FAF7F2] shadow-sm"
                  >
                    <Image
                      src={img}
                      alt={`Product image ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Primary Badge */}
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-[#CF565D] text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                        Cover
                      </span>
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          title="Set as cover image"
                          className="w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-stone-800 flex items-center justify-center transition-transform hover:scale-110"
                        >
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove image"
                        className="w-8 h-8 rounded-xl bg-white/90 hover:bg-rose-600 hover:text-white text-rose-600 flex items-center justify-center transition-transform hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Descriptions & Attributes */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D8C8]/60 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#F5DAD6]/50 flex items-center justify-center text-[#CF565D]">
                <Info className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-[#292525]">Narrative & Ritual Notes</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                Summary / Catalog Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A lightweight, velvety infusion of hand-harvested Damascus roses and botanical squalane..."
                className="w-full px-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                Detailed Ritual & Ingredients
              </label>
              <textarea
                rows={4}
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Application rituals, full ingredients listing (INCI), and aromatic profile notes..."
                className="w-full px-4 py-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 text-sm text-[#292525] focus:outline-none focus:border-[#CF565D] focus:ring-4 focus:ring-[#CF565D]/10 transition-all resize-none"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider mb-2">
                Product Tags
              </label>
              <div className="p-3 rounded-2xl border border-[#E8D8C8] bg-[#FAF7F2]/40 flex flex-wrap items-center gap-2 focus-within:border-[#CF565D] transition-all">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#E8D8C8] text-xs font-medium text-[#292525]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#746D69] hover:text-rose-600 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? "Type tag & press enter (e.g. organic, rosewater)" : "Add more..."}
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-[#292525] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar 1-column controls */}
        <div className="space-y-6">
          {/* Status & Visibility Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D8C8]/60 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-[#292525] uppercase tracking-wider border-b border-[#FAF7F2] pb-3">
              Visibility & Status
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2]/50 border border-[#E8D8C8]/60">
              <div>
                <p className="text-sm font-semibold text-[#292525]">
                  {isActive ? "Published" : "Draft / Inactive"}
                </p>
                <p className="text-xs text-[#746D69] mt-0.5">
                  {isActive
                    ? "Available to clients on public shop."
                    : "Hidden from customer storefront."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-[#CF565D]" : "bg-stone-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Inventory Status Indicator */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#292525] uppercase tracking-wider">
                Inventory State
              </label>
              {parseInt(stock, 10) <= 0 ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-semibold">Out of Stock (Purchases blocked)</span>
                </div>
              ) : parseInt(stock, 10) <= 5 ? (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-semibold">Low Stock Warning ({stock} units)</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold">In Stock ({stock} units available)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="bg-[#FAF7F2] rounded-3xl p-6 border border-[#E8D8C8] space-y-3">
            <div className="flex items-center gap-2 text-[#CF565D]">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Rose Essence Standards</h4>
            </div>
            <ul className="text-xs text-[#746D69] space-y-2 leading-relaxed">
              <li>• Always specify currency in UAE Dirhams (AED).</li>
              <li>• Use high-resolution photography with neutral warm lighting.</li>
              <li>• Ensure category assignments match the boutique taxonomy.</li>
              <li>• Active products immediately sync to the customer storefront.</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}

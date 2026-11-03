"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "../../../../../components/admin/ProductForm";
import { adminProductApi, ApiError } from "../../../../../lib/api-client";
import { Product } from "../../../../../types/product";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function EditProductContent() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await adminProductApi.getById(id);
        if (isMounted) {
          if (data && data.product) {
            setProduct(data.product);
          } else {
            setError("Product could not be found.");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiError ? err.message : "Failed to load product details";
          setError(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm flex items-center justify-center text-[#CF565D] mb-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-[#292525] tracking-wider uppercase">
          Loading Product Details...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white border border-[#E8D8C8] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-serif font-bold text-[#292525]">Product Not Found</h2>
        <p className="text-sm text-[#746D69]">{error || "The requested product does not exist or has been removed."}</p>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#CF565D] text-white text-sm font-semibold hover:bg-[#b8454c] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  return <ProductForm initialProduct={product} isEdit={true} />;
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8D8C8] shadow-sm flex items-center justify-center text-[#CF565D] mb-3">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-[#292525] tracking-wider uppercase">
            Loading...
          </p>
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}

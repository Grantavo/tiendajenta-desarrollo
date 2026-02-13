import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit2,
  X,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";
import ExcelJS from "exceljs";

import { toast } from "sonner";

import { db } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const generateRandomRef = () => `REF-${Math.floor(Math.random() * 1000000)}`;

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("shopCategories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchCategories = useCallback(async () => {
    try {
      const catsSnapshot = await getDocs(collection(db, "categories"));
      const cats = catsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setCategories(cats);
      localStorage.setItem("shopCategories", JSON.stringify(cats));
    } catch (e) {
      console.error("Error fetching categories", e);
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showVariants, setShowVariants] = useState(false);

  const initialForm = {
    title: "",
    price: "",
    oldPrice: "",
    categoryId: "",
    subcategoryId: "",
    stock: "",
    bestSeller: "no",
    description: "",
    reference: "",
    brand: "",
    items: [],
    images: [null, null, null, null],
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const productsCollection = collection(db, "products");
      const querySnapshot = await getDocs(productsCollection);
      const docs = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setProducts(docs);
    } catch {
      console.error("Error al cargar productos");
      toast.error("Error al conectar con la base de datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const rowsCount = worksheet ? worksheet.actualRowCount - 1 : 0;

      toast.info(`Excel leído: ${rowsCount} filas encontradas`, {
        description: "La subida masiva se habilitará próximamente.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al leer el archivo Excel");
    }
  };

  const excelInputRef = useRef(null);

  const selectedCatObj = categories.find((c) => c.id == formData.categoryId);
  const availableSubcats = selectedCatObj ? selectedCatObj.subcategories : [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Si es precio, limpiamos caracteres no numéricos
    if (name === "price" || name === "oldPrice") {
       // Eliminar todo lo que no sea dígito
       const rawValue = value.replace(/\D/g, "");
       setFormData((prev) => ({ ...prev, [name]: rawValue }));
       return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        return toast.warning("Imagen pesada", {
          description: "Máximo 1MB recomendado",
        });
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...formData.images];
        newImages[index] = reader.result;
        setFormData((prev) => ({ ...prev, images: newImages }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleVariants = (e) => {
    setShowVariants(e.target.checked);
    if (e.target.checked && formData.items.length === 0) {
      setFormData((prev) => ({ ...prev, items: ["", "", "", ""] }));
    }
  };

  const handleVariantChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index] = value;
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addVariantSlot = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, ""] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const productsCollection = collection(db, "products");
      const finalRef = formData.reference || generateRandomRef();
      const productData = {
        title: formData.title || "Sin Título",
        price: Number(formData.price) || 0,
        oldPrice: Number(formData.oldPrice) || 0,
        categoryId: formData.categoryId || "",
        subcategoryId: formData.subcategoryId || "",
        stock: Number(formData.stock) || 0,
        bestSeller: formData.bestSeller || "no",
        description: formData.description || "",
        reference: finalRef,
        brand: formData.brand || "Genérica",
        items: formData.items
          ? formData.items.filter((i) => i && i.trim() !== "")
          : [],
        images: formData.images.map((img) => img || null),
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), productData);
        toast.success("Producto actualizado correctamente ✅");
      } else {
        await addDoc(productsCollection, {
          ...productData,
          createdAt: new Date(),
        });
        toast.success("Producto publicado exitosamente 🚀");
      }
      closeModal();
      fetchProducts();
    } catch {
      toast.error("Error al guardar en la nube");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (product) => {
    const safeImages = [null, null, null, null];
    if (product.images) {
      product.images.forEach((img, i) => {
        if (i < 4) safeImages[i] = img;
      });
    }
    setFormData({ ...initialForm, ...product, images: safeImages });
    setEditingId(product.id);
    setShowVariants(product.items && product.items.length > 0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialForm);
    setShowVariants(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este producto de la nube?")) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "products", id));
        toast.info("Producto eliminado del inventario");
        await fetchProducts();
      } catch {
        toast.error("No se pudo eliminar el producto");
      } finally {
        setLoading(false);
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory ? p.categoryId == selectedCategory : true;

    return matchesSearch && matchesCategory;
  });

  const labelClass =
    "block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2";
  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestión de Productos
          </h1>
          <p className="text-sm text-slate-500">Administra tu inventario.</p>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-600/20"
          >
            <Plus size={18} /> Agregar
          </button>
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => excelInputRef.current.click()}
              className="w-full flex justify-center items-center gap-2 bg-green-600 text-white px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-bold hover:bg-green-700 transition shadow-md shadow-green-600/20"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
          </div>
          <button className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-slate-700 text-white px-4 py-3 md:py-2 rounded-xl md:rounded-lg font-bold hover:bg-slate-800 transition shadow-md shadow-slate-700/20">
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              id="search-products-table"
              name="search-products-table"
              type="text"
              placeholder="Buscar por título, ID..."
              className="w-full pl-10 pr-4 py-3 md:py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
             <select
              className="w-full h-full p-3 md:p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>         
          </div>
        </div>

        {/* VISTA ESCRITORIO (TABLA) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Imagen</th>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Ref/Marca</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-center">Destacado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-12 text-slate-400 animate-pulse"
                  >
                    Cargando productos de la nube...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-8 text-slate-400 italic"
                  >
                    No hay productos. ¡Agrega uno!
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title + " - Tienda Jenta"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-[200px]">
                      {product.title}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">
                          {formatPrice(product.price)}
                        </span>
                        {product.oldPrice > product.price && (
                          <span className="text-xs text-red-400 line-through">
                            {formatPrice(product.oldPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-slate-700">
                      {product.reference || "-"}
                    </td>
                    <td className="px-6 py-3">
                      {categories.find((c) => c.id == product.categoryId)
                        ?.name || "Sin cat."}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          product.stock > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} un.` : "Agotado"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {product.bestSeller === "si" && (
                        <span className="text-yellow-500 font-bold">★ Sí</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MÓVIL (CARDS) */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {loading ? (
             <div className="text-center py-12 text-slate-400 animate-pulse">
                Cargando productos...
             </div>
          ) : filteredProducts.length === 0 ? (
             <div className="text-center py-10 text-slate-400 italic">
                No se encontraron productos.
             </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="p-4 flex gap-4">
                <div className="w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative">
                   {product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        className="w-full h-full object-cover" 
                        alt="Prod" 
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                         <ImageIcon size={24} />
                      </div>
                   )}
                   {product.bestSeller === "si" && (
                      <div className="absolute top-0 right-0 bg-yellow-400 text-white p-1 rounded-bl-lg shadow-sm">
                         <span className="text-[10px] font-bold">★</span>
                      </div>
                   )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                   <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 truncate">
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                         <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {categories.find(c => c.id == product.categoryId)?.name || "Sin Cat."}
                         </span>
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${product.stock > 0 ? "border-green-200 text-green-700 bg-green-50" : "border-red-200 text-red-700 bg-red-50"}`}>
                            {product.stock} un.
                         </span>
                      </div>
                      <div className="flex items-end gap-2">
                         <span className="font-black text-slate-800">
                            {formatPrice(product.price)}
                         </span>
                         {product.oldPrice > product.price && (
                           <span className="text-xs text-slate-400 line-through mb-0.5">
                             {formatPrice(product.oldPrice)}
                           </span>
                         )}
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 mt-2">
                      <button 
                        onClick={() => openEdit(product)}
                        className="flex-1 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                         <Edit2 size={14} /> Editar
                      </button>
                      <button 
                         onClick={() => handleDelete(product.id)}
                         className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                      >
                         <Trash2 size={14} /> Borrar
                      </button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">
                {editingId ? "Editar Producto" : "Agregar Producto"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <form
                id="product-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div>
                  <label className={labelClass}>Título del Producto (*)</label>
                  <input
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Categoría (*)</label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Selecciona</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Subcategoría</label>
                    <select
                      name="subcategoryId"
                      value={formData.subcategoryId}
                      onChange={handleInputChange}
                      className={inputClass}
                      disabled={!formData.categoryId}
                    >
                      <option value="">Selecciona</option>
                      {availableSubcats.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Precio Real (*)</label>
                    <input
                      name="price"
                      type="text"
                      // Usamos formatPrice si hay valor, si no cadena vacía
                      value={formData.price ? formatPrice(formData.price) : ""}
                      onChange={handleInputChange}
                      required
                      className={inputClass}
                      placeholder="$ 0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Precio Antes</label>
                    <div className="relative">
                      <input
                        name="oldPrice"
                        type="text"
                        value={formData.oldPrice ? formatPrice(formData.oldPrice) : ""}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="$ 0"
                      />
                      {formData.price && formData.oldPrice > formData.price && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-lg">
                          -
                          {Math.round(
                            ((formData.oldPrice - formData.price) /
                              formData.oldPrice) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Stock (*)</label>
                    <input
                      name="stock"
                      type="number"
                      value={formData.stock}
                      onChange={handleInputChange}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Destacado</label>
                    <select
                      name="bestSeller"
                      value={formData.bestSeller}
                      onChange={handleInputChange}
                      className={inputClass}
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="product-bestseller" className={labelClass}>
                      Destacado
                    </label>
                    <select
                      id="product-bestseller"
                      name="bestSeller"
                      value={formData.bestSeller}
                      onChange={handleInputChange}
                      className={inputClass}
                    >
                      <option value="no">Normal</option>
                      <option value="si">¡Más Vendido!</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    id="product-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className={inputClass}
                  ></textarea>
                </div>
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <span className="text-sm font-bold">Variantes (Items)</span>
                    <input
                      type="checkbox"
                      checked={showVariants}
                      onChange={toggleVariants}
                      className="w-4 h-4"
                    />
                  </label>
                  {showVariants && (
                    <div className="grid grid-cols-2 gap-2">
                      {formData.items.map((item, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={item}
                          onChange={(e) =>
                            handleVariantChange(idx, e.target.value)
                          }
                          className="p-2 border rounded"
                          placeholder={`Variante ${idx + 1}`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={addVariantSlot}
                        className="bg-blue-50 text-blue-600 p-2 rounded text-xs"
                      >
                        + Agregar más
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Galería (Máx 4)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="aspect-square relative group border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden"
                      >
                        <label className="w-full h-full cursor-pointer">
                          {formData.images[index] ? (
                            <img
                              src={formData.images[index]}
                              alt={
                                (formData.title || "Producto") +
                                " - Foto " +
                                (index + 1)
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UploadCloud className="mx-auto text-slate-300" />
                          )}
                          <input
                            type="file"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="hidden"
                            accept="image/*"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t bg-slate-50">
              <button
                form="product-form"
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg"
              >
                {loading
                  ? "Cargando..."
                  : editingId
                  ? "Actualizar Producto"
                  : "Publicar Producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}

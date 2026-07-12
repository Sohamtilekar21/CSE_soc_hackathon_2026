"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWardrobe, classifyImage } from "@/lib/api";

type WardrobeItem = {
  id: string;
  image_path: string;
  image_url: string | null;
  label: string;
  type: string;
  colour: string;
  last_used: string | null;
  created_at: string;
};


export default function WardrobePage() {

  const queryClient = useQueryClient();


  const {
    data,
    isLoading,
    error,
  } = useQuery<{ items: WardrobeItem[] }>({
    queryKey: ["wardrobe"],
    queryFn: getWardrobe,
  });



  const addItem = useMutation({
    mutationFn: (file: File) => classifyImage(file),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["wardrobe"],
      });
    },
  });



  function handleAddItem(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file = e.target.files?.[0];

    if (!file) return;

    addItem.mutate(file);

    e.target.value = "";
  }



  const items = data?.items ?? [];



  return (

    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 px-4 py-10">


      {/* Background glow */}

      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />



      <div className="relative z-10 mx-auto max-w-6xl">


        <div className="mb-8 flex items-center justify-between">


          <div>

            <h1 className="text-4xl font-bold text-white">
              👕 My Wardrobe
            </h1>

            <p className="mt-2 text-zinc-300">
              Your AI-powered digital closet.
            </p>

          </div>



          <label className="
            cursor-pointer
            rounded-xl
            bg-emerald-500
            px-5
            py-3
            font-semibold
            text-black
            hover:bg-emerald-400
          ">

            {addItem.isPending
              ? "Uploading..."
              : "＋ Add Outfit"
            }


            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAddItem}
              disabled={addItem.isPending}
            />

          </label>


        </div>





        {error && (
  <p className="mb-5 text-red-400">
    {error instanceof Error ? error.message : String(error)}
  </p>
)}

{addItem.error && (
  <p className="mb-5 text-red-400">
    {addItem.error instanceof Error
      ? addItem.error.message
      : String(addItem.error)}
  </p>
)}






        {isLoading ? (

          <p className="text-white">
            Loading wardrobe...
          </p>


        ) : items.length === 0 ? (

          <div className="
            rounded-xl
            border
            border-white/10
            bg-white/10
            p-10
            text-center
            backdrop-blur-xl
          ">

            <p className="text-5xl">
              👗
            </p>

            <p className="mt-4 text-xl text-white">
              Your wardrobe is empty
            </p>

            <p className="mt-2 text-zinc-300">
              Upload your first clothing item.
            </p>

          </div>



        ) : (


          <div className="
            grid
            grid-cols-[repeat(auto-fill,minmax(220px,1fr))]
            gap-6
          ">


            {items.map((item) => (


              <div
                key={item.id}
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-white/10
                  bg-white/10
                  backdrop-blur-xl
                  shadow-xl
                "
              >


                {item.image_url ? (

                  <img
                    src={item.image_url}
                    alt={item.label}
                    className="
                      h-64
                      w-full
                      object-cover
                    "
                  />

                ) : (

                  <div className="
                    flex
                    h-64
                    items-center
                    justify-center
                    bg-black/20
                    text-5xl
                  ">
                    👕
                  </div>

                )}



                <div className="p-4">


                  <p className="
                    text-xl
                    font-semibold
                    capitalize
                    text-white
                  ">
                    {item.label}
                  </p>


                  <p className="mt-1 text-zinc-300">
                    {item.type} · {item.colour}
                  </p>


                </div>


              </div>


            ))}


          </div>

        )}


      </div>


    </main>

  );
}

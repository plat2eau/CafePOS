import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cheekoo's Admin",
    short_name: "Cheekoo's",
    description: "Admin management portal for Cheekoo",
    start_url: "/admin/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/cheekoo-dark.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  }
}
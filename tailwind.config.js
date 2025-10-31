export default {
  content: [
    "./views/**/*.{xian,hbs,html,js}",  // 🧠 Include all your XianFire templates
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        glass: "rgba(255, 255, 255, 0.2)"
      },
      backdropBlur: {
        xs: '2px'
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif']
      }
    }
  },
  plugins: [],
};

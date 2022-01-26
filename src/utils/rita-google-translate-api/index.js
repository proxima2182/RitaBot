const querystring = require("querystring");

const got = require("got");

const languages = require("./languages");

function translate (text, opts, gotopts)
{

   // eslint-disable-next-line no-param-reassign
   opts = opts || {};
   // eslint-disable-next-line no-param-reassign
   gotopts = gotopts || {};
   // eslint-disable-next-line init-declarations
   let e;
   [opts.from, opts.to].forEach((lang) =>
   {

      if (lang && !languages.isSupported(lang))
      {

         e = new Error();
         e.code = 400;
         e.message = `The language '${lang}' is not supported`;

      }

   });
   if (e)
   {

      return new Promise( (resolve, reject) =>
      {

         reject(e);

      });

   }

   opts.from = opts.from || "auto";
   opts.to = opts.to || "en";
   opts.tld = opts.tld || "com";

   opts.from = languages.getCode(opts.from);
   opts.to = languages.getCode(opts.to);

   let url = `https://translate.google.${opts.tld}/translate_a/t`;
   const data = {
      "client": opts.client || "dict-chrome-ex",
      "sl": opts.from,
      "tl": opts.to,
      "hl": opts.to,
      "dt": ["at", "bd", "ex", "ld", "md", "qca", "rw", "rm", "ss", "t"],
      "ie": "UTF-8",
      "oe": "UTF-8",
      "otf": 1,
      "ssel": 0,
      "tsel": 0,
      "kc": 7,
      "q": text
   };

   url = `${url}?${querystring.stringify(data)}`;

   return got(url, gotopts).then((res) =>
   {

      const result = {
         "text": "",
         "pronunciation": "",
         "from": {
            "language": {
               "didYouMean": false,
               "iso": ""
            },
            "text": {
               "autoCorrected": false,
               "value": "",
               "didYouMean": false
            }
         },
         "raw": ""
      };

      if (opts.raw)
      {

         result.raw = res.body;

      }

      const body = JSON.parse(res.body);

      if(Array.isArray(body))
      {

         body.forEach((obj) =>
         {

            if (obj)
            {

               result.text += obj;

            }

         });
      } else
      {
         if (body.sentences)
         {
            body.sentences.forEach((obj) =>
            {

               if (obj.trans)
               {

                  result.text += obj.trans;

               }
               if (obj.translit)
               {

                  result.pronunciation += obj.translit;

               }

            });
         }

         if (body.src === body.ld_result.srclangs[0])
         {

            result.from.language.iso = body.ld_result.srclangs[0];

         }
         else
         {

            result.from.language.didYouMean = true;
            result.from.language.iso = body.ld_result.srclangs[0];

         }

         if (body.spell)
         {

            let str = body.spell.spell_html_res;

            str = str.replace(/<b><i>/g, "[");
            str = str.replace(/<\/i><\/b>/g, "]");

            result.from.text.value = str;

            // Result.from.text.autoCorrected is always false using '/translate_a/t'
            result.from.text.didYouMean = true;

         }
      }

      return result;

   }).
      catch((err) =>
      {

         err.message += `\nUrl: ${url}`;
         if (err.statusCode !== undefined && err.statusCode !== 200)
         {

            err.code = "BAD_REQUEST";

         }
         else
         {

            err.code = "BAD_NETWORK";

         }
         throw err;

      });

}

module.exports = translate;
module.exports.languages = languages;

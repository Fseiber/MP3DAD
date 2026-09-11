package com.mp3dad

import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.File

class MusicScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MusicScanner"

    @ReactMethod
    fun scanAudioFiles(promise: Promise) {
        try {
            val audioList: WritableArray = Arguments.createArray()
            val contentResolver = reactApplicationContext.contentResolver

            val uri: Uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.ALBUM_ID
            )

            // Seleccionar solo pistas de audio válidas
            val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
            val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

            val cursor = contentResolver.query(
                uri,
                projection,
                selection,
                null,
                sortOrder
            )

            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val durationCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val dataCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val sizeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val dateAddedCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
                val dateModifiedCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
                val albumIdCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)

                val artworkUri = Uri.parse("content://media/external/audio/albumart")

                while (c.moveToNext()) {
                    val id = c.getLong(idCol)
                    val title = c.getString(titleCol) ?: ""
                    val artist = c.getString(artistCol) ?: "<unknown>"
                    val album = c.getString(albumCol) ?: "<unknown>"
                    val duration = c.getLong(durationCol)
                    val path = c.getString(dataCol) ?: ""
                    val size = c.getLong(sizeCol)
                    val dateAdded = c.getLong(dateAddedCol)
                    val dateModified = c.getLong(dateModifiedCol)
                    val albumId = c.getLong(albumIdCol)

                    val item: WritableMap = Arguments.createMap()
                    item.putString("id", id.toString())
                    item.putString("title", title)
                    item.putString("artist", if (artist == "<unknown>") "Artista Desconocido" else artist)
                    item.putString("album", if (album == "<unknown>") "Álbum Desconocido" else album)
                    item.putDouble("duration", duration.toDouble())
                    item.putString("path", path)
                    item.putDouble("size", size.toDouble())
                    item.putDouble("dateAdded", dateAdded.toDouble() * 1000)
                    item.putDouble("dateModified", dateModified.toDouble() * 1000)

                    val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                    item.putString("url", contentUri.toString())

                    if (albumId > 0) {
                        val albumArtUri = ContentUris.withAppendedId(artworkUri, albumId)
                        item.putString("artwork", albumArtUri.toString())
                    } else {
                        item.putNull("artwork")
                    }

                    if (path.isNotEmpty()) {
                        val file = File(path)
                        val parentFile = file.parentFile
                        if (parentFile != null) {
                            item.putString("folder", parentFile.name)
                            item.putString("folderPath", parentFile.absolutePath)
                        } else {
                            item.putString("folder", "Desconocida")
                            item.putString("folderPath", "")
                        }
                    } else {
                        item.putString("folder", "Desconocida")
                        item.putString("folderPath", "")
                    }

                    audioList.pushMap(item)
                }
            }

            promise.resolve(audioList)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Error al escanear archivos de audio: ${e.message}", e)
        }
    }
}

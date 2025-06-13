import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';

declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {
  private isDeviceConnected = false;
  private bluetoothSerial: any = null;
  private isPluginReady = false;

  constructor(private platform: Platform) {
    this.initializeBluetoothSerial();
  }

  private initializeBluetoothSerial() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      // Intentar inicializar inmediatamente
      this.checkBluetoothPlugin();

      // Esperar a deviceready para inicialización segura
      document.addEventListener('deviceready', () => {
        console.log('🚀 deviceready event fired, initializing Bluetooth plugin...');
        this.checkBluetoothPlugin();
        
        // Intentar asignar directamente después de deviceready
        if (!this.isPluginReady) {
          console.log('🔍 Looking for Bluetooth plugin after deviceready...');
          
          if (window.cordova && window.cordova.plugins && window.cordova.plugins.bluetoothSerial) {
            this.bluetoothSerial = window.cordova.plugins.bluetoothSerial;
            this.isPluginReady = true;
            console.log('✅ Found Bluetooth plugin in cordova.plugins namespace');
          } else if (window.BluetoothSerial) {
            this.bluetoothSerial = window.BluetoothSerial;
            this.isPluginReady = true;
            console.log('✅ Found Bluetooth plugin in window.BluetoothSerial');
          }
        }
      }, false);
      
      // Verificar periódicamente con un intervalo más corto
      const checkInterval = setInterval(() => {
        if (this.checkBluetoothPlugin()) {
          console.log('✅ Bluetooth plugin found and initialized');
          clearInterval(checkInterval);
        }
      }, 300);
      
      // Detener después de 10 segundos para no consumir recursos
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.isPluginReady) {
          console.warn('⚠️ Bluetooth plugin initialization timeout after 10 seconds');
        }
      }, 10000);
    }
  }

  private checkBluetoothPlugin(): boolean {
    try {
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.bluetoothSerial) {
        this.bluetoothSerial = window.cordova.plugins.bluetoothSerial;
        this.isPluginReady = true;
        console.log('✅ Bluetooth Serial plugin initialized successfully');
        return true;
      }
      
      if (window.BluetoothSerial) {
        this.bluetoothSerial = window.BluetoothSerial;
        this.isPluginReady = true;
        console.log('✅ Bluetooth Serial plugin found in window.BluetoothSerial');
        return true;
      }
      
      console.log('⏳ Bluetooth plugin not ready yet...');
      return false;
    } catch (error) {
      console.error('❌ Error checking Bluetooth plugin:', error);
      return false;
    }
  }

  private isPluginAvailable(): boolean {
    return this.bluetoothSerial !== null && this.isPluginReady;
  }

  async isBluetoothEnabled(): Promise<boolean> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log('🖥️ Mock: Bluetooth enabled (browser mode)');
      return true;
    }

    let attempts = 0;
    while (!this.isPluginAvailable() && attempts < 20) {
      console.log(`⏳ Waiting for Bluetooth plugin... attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!this.isPluginAvailable()) {
      console.log('❌ Bluetooth plugin not available after waiting');
      return false; // No lanzar error, solo retornar false
    }

    return new Promise((resolve) => {
      try {
        this.bluetoothSerial.isEnabled(
          () => {
            console.log('✅ Bluetooth is enabled');
            resolve(true);
          },
          (error: any) => {
            console.log('❌ Bluetooth is not enabled:', error);
            resolve(false);
          }
        );
      } catch (error) {
        console.error('❌ Error checking Bluetooth state:', error);
        resolve(false);
      }
    });
  }

  // Método mejorado para obtener TODOS los dispositivos (emparejados y descubiertos)
  async scanAllDevices(): Promise<any[]> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log('🖥️ Mock: Scanning all devices...');
      return [
        { 
          name: 'ZUMOE2', 
          address: '00:11:22:33:44:55',
          id: 'mock-device-1'
        }
      ];
    }

    if (!this.isPluginAvailable()) {
      throw new Error('Plugin de Bluetooth no disponible');
    }

    // Primero obtener dispositivos emparejados
    const pairedDevices = await this.getPairedDevices();
    
    // Luego buscar dispositivos disponibles
    const discoveredDevices = await this.discoverDevices();
    
    // Combinar ambas listas y eliminar duplicados
    const allDevices = [...pairedDevices, ...discoveredDevices];
    const uniqueDevices = allDevices.filter((device, index, self) => 
      index === self.findIndex(d => d.address === device.address)
    );
    
    console.log('📱 All available devices:', uniqueDevices);
    return uniqueDevices;
  }

  private async getPairedDevices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      console.log('🔍 Getting paired devices...');
      
      this.bluetoothSerial.list(
        (devices: any[]) => {
          console.log('📱 Paired devices:', devices);
          const validDevices = devices.filter(device => 
            device && device.address && device.address.length > 0
          );
          resolve(validDevices);
        },
        (error: any) => {
          console.error('❌ Error getting paired devices:', error);
          resolve([]); // No fallar, solo retornar array vacío
        }
      );
    });
  }

  private async discoverDevices(): Promise<any[]> {
    return new Promise((resolve) => {
      console.log('🔍 Discovering new devices...');
      
      if (!this.bluetoothSerial.discoverUnpaired) {
        console.log('⚠️ Device discovery not available');
        resolve([]);
        return;
      }
      
      this.bluetoothSerial.discoverUnpaired(
        (devices: any[]) => {
          console.log('📡 Discovered devices:', devices);
          const validDevices = devices.filter(device => 
            device && device.address && device.address.length > 0
          );
          resolve(validDevices);
        },
        (error: any) => {
          console.error('❌ Error discovering devices:', error);
          resolve([]); // No fallar, solo retornar array vacío
        }
      );
    });
  }

  // Mantener el método original para compatibilidad
  async scanDevices(): Promise<any[]> {
    return this.scanAllDevices();
  }

  // Método de conexión mejorado que funciona como Serial Bluetooth Terminal
  async connect(deviceAddress: string): Promise<void> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log(`🖥️ Mock: Connecting to ${deviceAddress}`);
      this.isDeviceConnected = true;
      return Promise.resolve();
    }

    // Solicitar permisos primero
    await this.requestPermissions();

    // Asegurar que el plugin esté disponible
    if (!this.isPluginReady) {
      console.log('⚠️ Plugin not initialized yet, trying again...');
      this.bluetoothSerial = window.cordova?.plugins?.bluetoothSerial || window.BluetoothSerial;
      this.isPluginReady = !!this.bluetoothSerial;
      
      if (!this.isPluginReady) {
        // Último intento con una espera
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.bluetoothSerial = window.cordova?.plugins?.bluetoothSerial || window.BluetoothSerial;
        this.isPluginReady = !!this.bluetoothSerial;
      }
    }

    if (!this.isPluginReady || !this.bluetoothSerial) {
      throw new Error('No se pudo inicializar el plugin de Bluetooth. Intenta reiniciar la app.');
    }

    return new Promise((resolve, reject) => {
      console.log(`🔗 Conectando a: ${deviceAddress} (modo inseguro)`);
      
      // Primero verificar si ya estamos conectados
      this.bluetoothSerial.isConnected(
        () => {
          console.log('⚠️ Ya está conectado, desconectando primero...');
          this.bluetoothSerial.disconnect(
            () => this.tryConnectInsecure(deviceAddress, resolve, reject),
            () => this.tryConnectInsecure(deviceAddress, resolve, reject)
          );
        },
        () => this.tryConnectInsecure(deviceAddress, resolve, reject)
      );
    });
  }
  
  // Método separado para intentar conectar usando connectInsecure
  private tryConnectInsecure(deviceAddress: string, resolve: Function, reject: Function): void {
    console.log(`🔗 Intentando connectInsecure a: ${deviceAddress}`);
    this.bluetoothSerial.connectInsecure(
      deviceAddress,
      () => {
        console.log('✅ Conectado exitosamente con connectInsecure');
        this.isDeviceConnected = true;
        resolve();
      },
      (error: any) => {
        console.error('❌ Error de conexión con connectInsecure:', error);
        
        // Si falla, intentar con el método normal
        console.log('🔄 Intentando método connect regular...');
        this.bluetoothSerial.connect(
          deviceAddress,
          () => {
            console.log('✅ Conectado exitosamente con connect regular');
            this.isDeviceConnected = true;
            resolve();
          },
          (error2: any) => {
            console.error('❌ Error de conexión con ambos métodos:', error2);
            this.isDeviceConnected = false;
            reject(new Error('No se pudo conectar al dispositivo con ningún método'));
          }
        );
      }
    );
  }

  // Método para desconectar de forma limpia
  async disconnect(): Promise<void> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log('🖥️ Mock: Disconnecting...');
      this.isDeviceConnected = false;
      return Promise.resolve();
    }

    if (!this.isPluginAvailable()) {
      this.isDeviceConnected = false;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        this.bluetoothSerial.disconnect(
          () => {
            console.log('✅ Successfully disconnected');
            this.isDeviceConnected = false;
            resolve();
          },
          (error: any) => {
            console.log('⚠️ Disconnect error (ignoring):', error);
            this.isDeviceConnected = false;
            resolve(); // Resolver de todas formas
          }
        );
      } catch (error) {
        console.error('❌ Exception during disconnect:', error);
        this.isDeviceConnected = false;
        resolve();
      }
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log(`🖥️ Mock: Sending command "${command}" to robot ZUMOE2`);
      return Promise.resolve();
    }

    if (!this.isPluginAvailable()) {
      throw new Error('Plugin de Bluetooth no disponible');
    }

    if (!this.isDeviceConnected) {
      throw new Error('Robot no conectado');
    }

    return new Promise((resolve, reject) => {
      console.log(`📤 Sending command: ${command} to ZUMOE2`);
      
      try {
        // Enviar el comando exactamente como lo espera el ESP32
        this.bluetoothSerial.write(
          command,
          () => {
            console.log(`✅ Command "${command}" sent successfully`);
            resolve();
          },
          (error: any) => {
            console.error('❌ Write error:', error);
            reject(new Error(`Error enviando comando: ${error}`));
          }
        );
      } catch (error) {
        console.error('❌ Exception sending command:', error);
        reject(new Error('Error en el envío del comando'));
      }
    });
  }

  isConnected(): boolean {
    return this.isDeviceConnected;
  }

  getPluginStatus(): string {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      return 'Browser Mode (Mock)';
    }
    return this.isPluginAvailable() ? 'Plugin Ready ✅' : 'Plugin Not Ready ❌';
  }

  // Método para habilitar Bluetooth en el dispositivo
  async enableBluetooth(): Promise<boolean> {
    if (!this.platform.is('capacitor') && !this.platform.is('cordova')) {
      console.log('🖥️ Mock: Enabling Bluetooth in browser mode');
      return Promise.resolve(true);
    }

    if (!this.isPluginAvailable()) {
      console.error('❌ Plugin not available for enabling Bluetooth');
      return Promise.reject(new Error('Plugin de Bluetooth no disponible'));
    }

    return new Promise((resolve, reject) => {
      try {
        this.bluetoothSerial.enable(
          () => {
            console.log('✅ Bluetooth enabled successfully');
            resolve(true);
          },
          (error: any) => {
            console.error('❌ Error enabling Bluetooth:', error);
            reject(new Error('No se pudo habilitar el Bluetooth'));
          }
        );
      } catch (error) {
        console.error('❌ Exception enabling Bluetooth:', error);
        reject(new Error('Error habilitando Bluetooth'));
      }
    });
  }

  // Método para solicitar permisos necesarios
  async requestPermissions(): Promise<boolean> {
    if (!this.platform.is('android')) return true;
    
    try {
      // For newer Capacitor versions, permissions are handled differently
      // We'll rely on the Bluetooth plugin itself to handle permissions
      console.log('📢 Permissions will be handled by the Bluetooth plugin');
      return true;
      
    } catch (error) {
      console.error('❌ Error with permissions:', error);
      return false;
    }
  }
}
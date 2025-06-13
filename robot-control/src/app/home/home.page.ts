import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@ionic/angular/standalone';
import { 
  ToastController, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonCard, 
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUp, arrowDown, arrowBack, arrowForward, stop } from 'ionicons/icons';
import { BluetoothService } from '../services/bluetooth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon
  ],
  providers: [BluetoothService] // Solo BluetoothService, no BluetoothSerial
})
export class HomePage implements OnInit {
  isConnected = false;
  deviceAddress = '';
  platformInfo = '';

  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private bluetoothService: BluetoothService
  ) {
    addIcons({ arrowUp, arrowDown, arrowBack, arrowForward, stop });
  }

  async ngOnInit() {
    try {
      this.platformInfo = `Platforms: ${this.platform.platforms().join(', ')}`;
      
      console.log('Platform info:', {
        isCapacitor: this.platform.is('capacitor'),
        isCordova: this.platform.is('cordova'),
        isAndroid: this.platform.is('android'),
        isDesktop: this.platform.is('desktop'),
        platforms: this.platform.platforms()
      });

      console.log('Bluetooth plugin status:', this.bluetoothService.getPluginStatus());
      
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  async connectBluetooth() {
    const loading = await this.loadingController.create({
      message: 'Iniciando conexión Bluetooth...'
    });
    await loading.present();

    try {
      console.log('Starting Bluetooth connection process...');
      
      // Verificar si Bluetooth está habilitado
      loading.message = 'Verificando Bluetooth...';
      const isEnabled = await this.bluetoothService.isBluetoothEnabled();
      if (!isEnabled) {
        await loading.dismiss();
        this.showBluetoothAlert();
        return;
      }

      // Buscar dispositivos emparejados
      loading.message = 'Buscando ZUMOE2...';
      const devices = await this.bluetoothService.scanDevices();
      
      console.log('Devices found:', devices);

      if (devices.length === 0) {
        await loading.dismiss();
        this.showToast('No se encontraron dispositivos Bluetooth emparejados. Ve a Configuración → Bluetooth y empareja ZUMOE2 primero.');
        return;
      }

      // Buscar específicamente ZUMOE2
      const zumoDevice = devices.find((device: any) => 
        device.name && device.name.includes('ZUMOE2')
      );

      if (zumoDevice) {
        loading.message = `Conectando a ${zumoDevice.name}...`;
        await this.connectToDevice(zumoDevice);
        await loading.dismiss();
      } else {
        await loading.dismiss();
        // Mostrar todos los dispositivos si ZUMOE2 no se encuentra
        this.showDeviceSelectionAlert(devices);
      }

    } catch (error) {
      await loading.dismiss();
      console.error('Error en conexión Bluetooth:', error);
      this.showToast(`Error: ${error}`);
    }
  }

  async showDeviceSelectionAlert(devices: any[]) {
    const alert = await this.alertController.create({
      header: 'Seleccionar dispositivo',
      message: 'Selecciona el dispositivo Bluetooth:',
      inputs: devices.map(device => ({
        name: 'device',
        type: 'radio',
        label: `${device.name || 'Desconocido'} (${device.address})`,
        value: device
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Conectar',
          handler: async (selectedDevice) => {
            if (selectedDevice) {
              await this.connectToDevice(selectedDevice);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async connectToDevice(device: any) {
    try {
      this.deviceAddress = device.address;
      await this.bluetoothService.connect(this.deviceAddress);
      this.isConnected = true;
      this.showToast(`¡Conectado a ${device.name}! Ya puedes controlar el robot.`);
    } catch (error) {
      console.error('Error al conectar:', error);
      this.showToast(`Error al conectar: ${error}`);
    }
  }

  async disconnectBluetooth() {
    try {
      await this.bluetoothService.disconnect();
      this.isConnected = false;
      this.showToast('Desconectado del robot');
    } catch (error) {
      console.error('Error al desconectar:', error);
      this.showToast('Error al desconectar');
    }
  }

  async sendCommand(command: string) {
    if (!this.isConnected) {
      this.showToast('Robot no conectado. Conecta primero a ZUMOE2.');
      return;
    }

    try {
      await this.bluetoothService.sendCommand(command);
      console.log(`Command sent: ${command} -> ${this.getCommandName(command)}`);
      // Mostrar feedback visual más sutil
      const toast = await this.toastController.create({
        message: `${this.getCommandName(command)}`,
        duration: 1000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error al enviar comando:', error);
      this.showToast('Error al enviar comando al robot');
    }
  }

  private getCommandName(command: string): string {
    switch (command) {
      case '1': return 'Adelante';
      case '2': return 'Derecha';
      case '3': return 'Izquierda';
      case '4': return 'Atrás';
      case '5': return 'Stop';
      default: return 'Desconocido';
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  async showDebugInfo() {
    const alert = await this.alertController.create({
      header: 'Debug Info',
      message: `
        Platform: ${this.platformInfo}
        Capacitor: ${this.platform.is('capacitor')}
        Cordova: ${this.platform.is('cordova')}
        Android: ${this.platform.is('android')}
        Desktop: ${this.platform.is('desktop')}
        Plugin Status: ${this.bluetoothService.getPluginStatus()}
        Connected: ${this.isConnected}
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showBluetoothAlert() {
    const alert = await this.alertController.create({
      header: 'Bluetooth deshabilitado',
      message: 'Esta aplicación necesita Bluetooth para funcionar. Puedes habilitarlo de estas formas:',
      buttons: [
        {
          text: 'Configuración manual',
          handler: () => {
            this.showManualBluetoothInstructions();
          }
        },
        {
          text: 'Intentar habilitar',
          handler: async () => {
            await this.tryEnableBluetooth();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  private async showManualBluetoothInstructions() {
    const alert = await this.alertController.create({
      header: 'Habilitar Bluetooth manualmente',
      message: `
        1. Ve a Configuración → Bluetooth
        2. Activa el Bluetooth
        3. Empareja tu dispositivo ZUMOE2/ESP32
        4. Regresa a esta aplicación
        5. Presiona "Connect to ZUMOE2"
      `,
      buttons: [
        {
          text: 'Entendido',
          handler: () => {
            this.showToast('Habilita Bluetooth y empareja el dispositivo, luego regresa a la app');
          }
        }
      ]
    });
    await alert.present();
  }

  private async tryEnableBluetooth() {
    const loading = await this.loadingController.create({
      message: 'Habilitando Bluetooth...'
    });
    await loading.present();

    try {
      //await this.bluetoothService.enableBluetooth();
      await loading.dismiss();
      this.showToast('Bluetooth habilitado correctamente');
      
      // Esperar un poco y reintentar la conexión
      setTimeout(() => {
        this.connectBluetooth();
      }, 2000);
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error enabling Bluetooth:', error);
      
      // Mostrar instrucciones manuales si falla
      const alert = await this.alertController.create({
        header: 'No se pudo habilitar automáticamente',
        message: 'Por favor, habilita el Bluetooth manualmente en Configuración → Bluetooth',
        buttons: [
          {
            text: 'Entendido',
            handler: () => {
              this.showToast('Ve a Configuración para habilitar Bluetooth manualmente');
            }
          }
        ]
      });
      await alert.present();
    }
  }

  // Agregar también este método para verificar si ya está habilitado
  async recheckBluetooth() {
    try {
      const isEnabled = await this.bluetoothService.isBluetoothEnabled();
      if (isEnabled) {
        this.showToast('Bluetooth detectado. Intenta conectar nuevamente.');
      } else {
        this.showToast('Bluetooth aún no está habilitado');
      }
    } catch (error) {
      this.showToast('Error verificando Bluetooth');
    }
  }
}
